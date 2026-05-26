#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include "driver/twai.h"
#include "esp_wifi.h"
#include <math.h>
#include <stdarg.h>

// LilyGO T-2CAN native TWAI bus pins.
// The board also exposes MCP2515 on SPI (CS=10, RST=9, INT=8). Pin 10 is not a CAN enable pin.
#define CAN_TX_PIN 7
#define CAN_RX_PIN 6

const char* ssid = "LilyGO_EDC17";
const char* password = "password123";
WebSocketsServer webSocket = WebSocketsServer(81);
IPAddress apIp(192, 168, 4, 1);
IPAddress apGateway(192, 168, 4, 1);
IPAddress apMask(255, 255, 255, 0);

enum DiagnosticMode { MODE_LIVE, MODE_OBD_ID };
enum CommandType { CMD_SET_PIDS, CMD_SET_RAW_TRACE, CMD_IDENTIFY };
const uint8_t MAX_ACTIVE_PIDS = 48;

struct TelemetryData {
  float rpm;
  float map_press;
  float rail;
  float lambda_b1s1;
  float maf;
  float ect;
  float vss;
  float throttle;
  float accel_d;
  float iat;
  float egt;
  float baro;
  float load;
  float egr;
  float egr_error;
  float fuel_level;
  float dpf_diff;
  float battery;
  float cat_temp_b1s1;
  float relative_throttle;
  float ambient_temp;
  float cmd_throttle;
  float oil_temp;
  float torque_demand;
  float torque_actual;
  float torque_reference;
  float can_rx_count;
  float can_tx_count;
  float can_error_count;
  float can_tx_error_count;
  float can_rx_error_count;
  float can_bus_error_count;
  float can_tx_failed_count;
  float can_rx_missed_count;
  float can_arb_lost_count;
  float can_state;
};

struct ScanItem {
  uint8_t service;
  uint16_t did;
  const char* label;
  const char* app_key;
};

struct CommandMessage {
  CommandType type;
  uint8_t pids[MAX_ACTIVE_PIDS];
  uint8_t pid_count;
  bool raw_enabled;
};

const uint8_t WIFI_CHANNEL = 6;
const uint8_t WIFI_MAX_CLIENTS = 1;
const uint8_t OUTBOUND_QUEUE_LENGTH = 10;
const size_t OUTBOUND_PAYLOAD_SIZE = 1400;

struct OutboundMessage {
  char payload[OUTBOUND_PAYLOAD_SIZE];
};

struct RequestState {
  bool pending;
  uint32_t target_id;
  uint8_t service;
  uint16_t pid;
  uint32_t sent_at;
  uint16_t timeout_ms;
};

struct IsoTpState {
  bool active;
  uint32_t response_id;
  uint16_t expected_len;
  uint16_t size;
  uint8_t next_sn;
  uint32_t started_at;
};

TelemetryData liveData;

uint8_t active_pids[MAX_ACTIVE_PIDS] = {0x0C, 0x0B, 0x23, 0x10, 0x05, 0x0D, 0x42, 0x0F};
uint8_t num_active_pids = 8;
uint8_t current_pid_index = 0;
DiagnosticMode current_mode = MODE_LIVE;

ScanItem prof_id_list[] = {
  {0x09, 0x02, "VIN_OBD", "vin"},
  {0x09, 0x04, "CALIB_ID", "sw"},
  {0x09, 0x06, "CVN", "sw_upg"}
};
const uint8_t num_id_items = sizeof(prof_id_list) / sizeof(prof_id_list[0]);
uint8_t scan_idx = 0;

bool raw_trace_enabled = false;
uint32_t last_live_broadcast = 0;
uint32_t last_raw_emit = 0;
uint32_t last_status_emit = 0;
const uint16_t LIVE_FAST_INTERVAL_MS = 10;
const uint16_t LIVE_MEDIUM_INTERVAL_MS = 25;
const uint16_t LIVE_NORMAL_INTERVAL_MS = 50;
const uint16_t LIVE_SLOW_INTERVAL_MS = 100;

uint8_t isotp_buffer[1024];
IsoTpState isotp;
RequestState request_state;

QueueHandle_t commandQueue;
QueueHandle_t outboundQueue;
TaskHandle_t NetworkTaskHandle;
TaskHandle_t CanTaskHandle;

void initTelemetry();
void configureWiFiAp();
void queueJson(const char* payload);
void queueJsonf(const char* fmt, ...);
void queueDebug(const String& msg);
void buildAndSendJson();
void handleNetworkCommands(const String& msg);
void handleCommand(const CommandMessage& cmd);
void canTaskFunction(void* pvParameters);
void networkTaskFunction(void* pvParameters);
void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length);
bool sendCanRequest(uint32_t target_id, uint8_t service, uint16_t pid, uint16_t timeout_ms);
void handleDiagnosticFrame(const twai_message_t& rx_msg);
void handleIsoPayload(uint8_t* payload, uint16_t len);
void handlePositivePayload(uint8_t* payload, uint16_t len);
void parseOBD2Live(uint8_t pid, uint8_t* bytes, uint16_t len);
void sendRawFrame(const twai_message_t& msg, const char* direction);
bool isValidationRawFrame(uint32_t id);
void tickLiveMode();
void tickDiagnosticMode();
void tickTimeouts();
uint16_t liveBroadcastIntervalMs();
uint16_t liveRequestTimeoutMs();
bool liveBroadcastDue();
void sendFlowControl(uint32_t response_id);
void sanitizeString(char* str);
void hexEncode(const uint8_t* data, uint16_t len, char* out, uint16_t out_len);
void jsonNumber(char* out, size_t out_len, float value, uint8_t decimals);
bool isAllowedLivePid(uint8_t pid);
float decodePercent(uint8_t value);
float decodeTemp16(uint8_t msb, uint8_t lsb);
int16_t decodeSigned16(uint8_t msb, uint8_t lsb);
void parseEgtBank1(uint8_t* bytes, uint16_t len);
void parseDpfBank1(uint8_t* bytes, uint16_t len);

void setup() {
  Serial.begin(115200);
  delay(500);

  initTelemetry();
  commandQueue = xQueueCreate(8, sizeof(CommandMessage));
  outboundQueue = xQueueCreate(OUTBOUND_QUEUE_LENGTH, sizeof(OutboundMessage));

  twai_general_config_t g = TWAI_GENERAL_CONFIG_DEFAULT(
    (gpio_num_t)CAN_TX_PIN,
    (gpio_num_t)CAN_RX_PIN,
    TWAI_MODE_NORMAL
  );
  twai_timing_config_t t = TWAI_TIMING_CONFIG_500KBITS();
  twai_filter_config_t f;
  f.single_filter = false;
  f.acceptance_code = 0;
  f.acceptance_mask = 0xFFFFFFFF;

  esp_err_t install_result = twai_driver_install(&g, &t, &f);
  if (install_result == ESP_OK && twai_start() == ESP_OK) {
    queueDebug("TWAI READY GPIO7/6 500K");
  } else {
    queueDebug("TWAI START FAILED");
  }

  configureWiFiAp();
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);

  xTaskCreatePinnedToCore(networkTaskFunction, "NetTask", 6144, NULL, 1, &NetworkTaskHandle, 0);
  xTaskCreatePinnedToCore(canTaskFunction, "CanTask", 8192, NULL, 2, &CanTaskHandle, 1);
}

void loop() {
  vTaskDelete(NULL);
}

void configureWiFiAp() {
  WiFi.persistent(false);
  WiFi.disconnect(true, true);
  WiFi.mode(WIFI_OFF);
  delay(100);

  WiFi.mode(WIFI_AP);
  WiFi.setSleep(false);
  WiFi.softAPConfig(apIp, apGateway, apMask);
  WiFi.softAPsetHostname("JdpLogger");

  bool started = WiFi.softAP(ssid, password, WIFI_CHANNEL, false, WIFI_MAX_CLIENTS);
  esp_wifi_set_ps(WIFI_PS_NONE);
  esp_wifi_set_max_tx_power(78);

  if (started) {
    queueDebug("WIFI AP READY 192.168.4.1 CH6");
  } else {
    queueDebug("WIFI AP START FAILED");
  }
}

void initTelemetry() {
  memset(&liveData, 0, sizeof(liveData));
  liveData.ect = NAN;
  liveData.lambda_b1s1 = NAN;
  liveData.iat = NAN;
  liveData.egt = NAN;
  liveData.egr_error = NAN;
  liveData.fuel_level = NAN;
  liveData.cat_temp_b1s1 = NAN;
  liveData.relative_throttle = NAN;
  liveData.ambient_temp = NAN;
  liveData.cmd_throttle = NAN;
  liveData.battery = NAN;
  liveData.oil_temp = NAN;
  liveData.torque_demand = NAN;
  liveData.torque_actual = NAN;
  liveData.torque_reference = NAN;
  liveData.accel_d = NAN;
  liveData.dpf_diff = NAN;
  memset(&request_state, 0, sizeof(request_state));
  memset(&isotp, 0, sizeof(isotp));
}

void networkTaskFunction(void* pvParameters) {
  OutboundMessage outgoing;
  for (;;) {
    webSocket.loop();
    while (xQueueReceive(outboundQueue, &outgoing, 0) == pdTRUE) {
      webSocket.broadcastTXT(outgoing.payload);
      taskYIELD();
    }
    vTaskDelay(pdMS_TO_TICKS(2));
  }
}

void canTaskFunction(void* pvParameters) {
  CommandMessage command;
  twai_message_t rx_msg;

  for (;;) {
    while (xQueueReceive(commandQueue, &command, 0) == pdTRUE) {
      handleCommand(command);
    }

    if (twai_receive(&rx_msg, pdMS_TO_TICKS(1)) == ESP_OK) {
      liveData.can_rx_count += 1;
      sendRawFrame(rx_msg, "rx");

      if (rx_msg.identifier >= 0x7E8 && rx_msg.identifier <= 0x7EF) {
        handleDiagnosticFrame(rx_msg);
      }
    }

    tickTimeouts();

    if (!request_state.pending) {
      if (current_mode == MODE_LIVE) {
        tickLiveMode();
      } else {
        tickDiagnosticMode();
      }
    }

    if (millis() - last_status_emit > 1000) {
      twai_status_info_t status;
      if (twai_get_status_info(&status) == ESP_OK) {
        liveData.can_tx_error_count = status.tx_error_counter;
        liveData.can_rx_error_count = status.rx_error_counter;
        liveData.can_bus_error_count = status.bus_error_count;
        liveData.can_tx_failed_count = status.tx_failed_count;
        liveData.can_rx_missed_count = status.rx_missed_count;
        liveData.can_arb_lost_count = status.arb_lost_count;
        liveData.can_state = status.state;
        liveData.can_error_count = status.tx_error_counter + status.rx_error_counter;
      }
      last_status_emit = millis();
    }
  }
}

void tickLiveMode() {
  if (num_active_pids == 0) {
    if (millis() - last_live_broadcast >= LIVE_SLOW_INTERVAL_MS) {
      buildAndSendJson();
      last_live_broadcast = millis();
    }
    return;
  }

  if (current_pid_index >= num_active_pids) {
    if (liveBroadcastDue()) {
      buildAndSendJson();
      last_live_broadcast = millis();
      current_pid_index = 0;
    }
    return;
  }

  uint8_t pid = active_pids[current_pid_index++];
  if (!isAllowedLivePid(pid)) return;
  sendCanRequest(0x7DF, 0x01, pid, liveRequestTimeoutMs());
}

uint16_t liveBroadcastIntervalMs() {
  if (num_active_pids <= 1) return LIVE_FAST_INTERVAL_MS;
  if (num_active_pids <= 3) return LIVE_MEDIUM_INTERVAL_MS;
  if (num_active_pids <= 8) return LIVE_NORMAL_INTERVAL_MS;
  return LIVE_SLOW_INTERVAL_MS;
}

uint16_t liveRequestTimeoutMs() {
  if (num_active_pids <= 1) return 25;
  if (num_active_pids <= 3) return 40;
  return 80;
}

bool liveBroadcastDue() {
  return millis() - last_live_broadcast >= liveBroadcastIntervalMs();
}

void tickDiagnosticMode() {
  if (current_mode == MODE_OBD_ID) {
    if (scan_idx >= num_id_items) {
      current_mode = MODE_LIVE;
      scan_idx = 0;
      queueJson("{\"status\":\"Gotowy\"}");
      return;
    }

    ScanItem item = prof_id_list[scan_idx];
    queueJsonf("{\"status\":\"%s\"}", item.label);
    sendCanRequest(0x7DF, item.service, item.did, 1200);
  }
}

void tickTimeouts() {
  if (isotp.active && millis() - isotp.started_at > 1500) {
    isotp.active = false;
    liveData.can_error_count += 1;
    if (current_mode == MODE_OBD_ID) scan_idx++;
    request_state.pending = false;
  }

  if (request_state.pending && millis() - request_state.sent_at > request_state.timeout_ms) {
    request_state.pending = false;
    if (current_mode == MODE_OBD_ID) {
      scan_idx++;
    }
  }
}

bool sendCanRequest(uint32_t target_id, uint8_t service, uint16_t pid, uint16_t timeout_ms) {
  twai_message_t msg;
  memset(&msg, 0, sizeof(msg));
  msg.identifier = target_id;
  msg.extd = 0;
  msg.rtr = 0;
  msg.data_length_code = 8;

  if (service == 0x10 || service == 0x1A || service == 0x3E) {
    msg.data[0] = 0x02;
    msg.data[1] = service;
    msg.data[2] = pid & 0xFF;
  } else if (service == 0x22) {
    msg.data[0] = 0x03;
    msg.data[1] = 0x22;
    msg.data[2] = (pid >> 8) & 0xFF;
    msg.data[3] = pid & 0xFF;
  } else if (service == 0x03 || service == 0x04) {
    msg.data[0] = 0x01;
    msg.data[1] = service;
  } else {
    msg.data[0] = 0x02;
    msg.data[1] = service;
    msg.data[2] = pid & 0xFF;
  }

  esp_err_t result = twai_transmit(&msg, pdMS_TO_TICKS(5));
  if (result == ESP_OK) {
    liveData.can_tx_count += 1;
    sendRawFrame(msg, "tx");
    request_state.pending = true;
    request_state.target_id = target_id;
    request_state.service = service;
    request_state.pid = pid;
    request_state.sent_at = millis();
    request_state.timeout_ms = timeout_ms;
    return true;
  }

  liveData.can_error_count += 1;
  return false;
}

void handleDiagnosticFrame(const twai_message_t& rx_msg) {
  uint8_t pci_type = rx_msg.data[0] & 0xF0;

  if (rx_msg.data[0] < 0x10) {
    uint8_t payload_len = rx_msg.data[0] & 0x0F;
    if (payload_len > 7) payload_len = 7;
    uint8_t payload[8];
    memcpy(payload, &rx_msg.data[1], payload_len);
    handleIsoPayload(payload, payload_len);
    return;
  }

  if (pci_type == 0x10) {
    isotp.active = true;
    isotp.response_id = rx_msg.identifier;
    isotp.expected_len = ((rx_msg.data[0] & 0x0F) << 8) | rx_msg.data[1];
    if (isotp.expected_len > sizeof(isotp_buffer)) isotp.expected_len = sizeof(isotp_buffer);
    isotp.size = 0;
    isotp.next_sn = 1;
    isotp.started_at = millis();

    uint8_t first_copy = min((uint16_t)6, isotp.expected_len);
    memcpy(isotp_buffer, &rx_msg.data[2], first_copy);
    isotp.size = first_copy;
    sendFlowControl(rx_msg.identifier);
    return;
  }

  if (pci_type == 0x20 && isotp.active && rx_msg.identifier == isotp.response_id) {
    uint8_t sequence = rx_msg.data[0] & 0x0F;
    if (sequence != isotp.next_sn) {
      isotp.active = false;
      liveData.can_error_count += 1;
      request_state.pending = false;
      return;
    }

    isotp.next_sn = (isotp.next_sn + 1) & 0x0F;
    for (uint8_t i = 1; i < 8 && isotp.size < isotp.expected_len; i++) {
      isotp_buffer[isotp.size++] = rx_msg.data[i];
    }

    if (isotp.size >= isotp.expected_len) {
      isotp.active = false;
      handleIsoPayload(isotp_buffer, isotp.expected_len);
    }
  }
}

void sendFlowControl(uint32_t response_id) {
  twai_message_t fc;
  memset(&fc, 0, sizeof(fc));
  fc.identifier = response_id >= 0x7E8 ? response_id - 8 : 0x7E0;
  fc.data_length_code = 8;
  fc.data[0] = 0x30;
  fc.data[1] = 0x00;
  fc.data[2] = 0x05;
  if (twai_transmit(&fc, pdMS_TO_TICKS(5)) == ESP_OK) {
    liveData.can_tx_count += 1;
    sendRawFrame(fc, "tx");
  }
}

void handleIsoPayload(uint8_t* payload, uint16_t len) {
  if (len == 0) return;

  uint8_t sid = payload[0];

  if (sid == 0x7F) {
    uint8_t nrc = len > 2 ? payload[2] : 0x00;
    if (nrc == 0x78) {
      request_state.sent_at = millis();
      request_state.timeout_ms = 1200;
      return;
    }

    queueJsonf("{\"status\":\"NRC %02X\"}", nrc);
    if (current_mode == MODE_OBD_ID) scan_idx++;
    request_state.pending = false;
    return;
  }

  handlePositivePayload(payload, len);
}

void handlePositivePayload(uint8_t* payload, uint16_t len) {
  uint8_t sid = payload[0];

  if (sid == 0x41 && len >= 2) {
    parseOBD2Live(payload[1], &payload[2], len - 2);
    request_state.pending = false;
    return;
  }

  if (sid == 0x49) {
    if (scan_idx >= num_id_items) {
      request_state.pending = false;
      return;
    }

    uint16_t start = len > 3 ? 3 : 2;
    if (start > len) start = len;

    uint16_t count = len - start;
    if (count > 510) count = 510;

    char text[512];
    char hex[1025];
    memcpy(text, &payload[start], count);
    text[count] = '\0';
    sanitizeString(text);
    hexEncode(&payload[start], count, hex, sizeof(hex));

    queueJsonf(
      "{\"%s\":\"%s\",\"%s_hex\":\"%s\"}",
      prof_id_list[scan_idx].app_key,
      text,
      prof_id_list[scan_idx].app_key,
      hex
    );

    scan_idx++;
    request_state.pending = false;
    return;
  }

  request_state.pending = false;
}

void parseOBD2Live(uint8_t pid, uint8_t* bytes, uint16_t len) {
  if (len == 0) return;

  switch (pid) {
    case 0x0C:
      if (len >= 2) liveData.rpm = ((bytes[0] * 256.0f) + bytes[1]) / 4.0f;
      break;
    case 0x0B:
      liveData.map_press = bytes[0] * 10.0f;
      break;
    case 0x23:
      if (len >= 2) liveData.rail = ((bytes[0] * 256.0f) + bytes[1]) * 10.0f;
      break;
    case 0x24:
      if (len >= 2) liveData.lambda_b1s1 = (((bytes[0] * 256.0f) + bytes[1]) * 2.0f) / 65536.0f;
      break;
    case 0x10:
      if (len >= 2) liveData.maf = ((bytes[0] * 256.0f) + bytes[1]) / 100.0f;
      break;
    case 0x05:
      liveData.ect = bytes[0] - 40.0f;
      break;
    case 0x0D:
      liveData.vss = bytes[0];
      break;
    case 0x11:
      liveData.throttle = decodePercent(bytes[0]);
      break;
    case 0x49:
      liveData.accel_d = decodePercent(bytes[0]);
      break;
    case 0x0F:
      liveData.iat = bytes[0] - 40.0f;
      break;
    case 0x78:
      parseEgtBank1(bytes, len);
      break;
    case 0x33:
      liveData.baro = bytes[0] * 10.0f;
      break;
    case 0x04:
      liveData.load = (bytes[0] * 100.0f) / 255.0f;
      break;
    case 0x2C:
      liveData.egr = decodePercent(bytes[0]);
      break;
    case 0x2D:
      liveData.egr_error = ((bytes[0] - 128.0f) * 100.0f) / 128.0f;
      break;
    case 0x2F:
      liveData.fuel_level = decodePercent(bytes[0]);
      break;
    case 0x7A:
      parseDpfBank1(bytes, len);
      break;
    case 0x42:
      if (len >= 2) {
        liveData.battery = ((bytes[0] * 256.0f) + bytes[1]) / 1000.0f;
      }
      break;
    case 0x3C:
      if (len >= 2) liveData.cat_temp_b1s1 = decodeTemp16(bytes[0], bytes[1]);
      break;
    case 0x45:
      liveData.relative_throttle = decodePercent(bytes[0]);
      break;
    case 0x46:
      liveData.ambient_temp = bytes[0] - 40.0f;
      break;
    case 0x4C:
      liveData.cmd_throttle = decodePercent(bytes[0]);
      break;
    case 0x5C:
      liveData.oil_temp = bytes[0] - 40.0f;
      break;
    case 0x61:
      liveData.torque_demand = bytes[0] - 125.0f;
      break;
    case 0x62:
      liveData.torque_actual = bytes[0] - 125.0f;
      break;
    case 0x63:
      if (len >= 2) liveData.torque_reference = (bytes[0] * 256.0f) + bytes[1];
      break;
  }
}

float decodePercent(uint8_t value) {
  return (value * 100.0f) / 255.0f;
}

float decodeTemp16(uint8_t msb, uint8_t lsb) {
  return (((msb * 256.0f) + lsb) / 10.0f) - 40.0f;
}

int16_t decodeSigned16(uint8_t msb, uint8_t lsb) {
  return (int16_t)((((uint16_t)msb) << 8) | lsb);
}

void parseEgtBank1(uint8_t* bytes, uint16_t len) {
  if (len < 3) return;

  uint8_t supported = bytes[0] & 0x0F;
  for (uint8_t sensor = 0; sensor < 4; sensor++) {
    uint8_t pair_index = 1 + (sensor * 2);
    if (!(supported & (1 << sensor))) continue;
    if (pair_index + 1 >= len) continue;
    liveData.egt = decodeTemp16(bytes[pair_index], bytes[pair_index + 1]);
    return;
  }
}

void parseDpfBank1(uint8_t* bytes, uint16_t len) {
  if (len < 3) return;

  bool delta_supported = bytes[0] & 0x01;
  if (!delta_supported) return;

  // SAE PID 0x7A reports signed DPF bank 1 delta pressure in 0.01 kPa.
  liveData.dpf_diff = decodeSigned16(bytes[1], bytes[2]) * 0.1f;
}

void appendRawText(char* payload, size_t payload_len, const char* text) {
  size_t used = strlen(payload);
  if (used >= payload_len - 1) return;
  strncat(payload, text, payload_len - used - 1);
}

void appendNumberField(char* payload, size_t payload_len, const char* key, float value, uint8_t decimals, bool& first) {
  char number[18];
  char field[64];
  jsonNumber(number, sizeof(number), value, decimals);
  snprintf(field, sizeof(field), "%s\"%s\":%s", first ? "" : ",", key, number);
  appendRawText(payload, payload_len, field);
  first = false;
}

void appendPidField(char* payload, size_t payload_len, uint8_t pid, bool& first) {
  switch (pid) {
    case 0x0C:
      appendNumberField(payload, payload_len, "rpm", liveData.rpm, 0, first);
      break;
    case 0x0B:
      appendNumberField(payload, payload_len, "map_press", liveData.map_press, 0, first);
      break;
    case 0x23:
      appendNumberField(payload, payload_len, "rail", liveData.rail, 0, first);
      break;
    case 0x24:
      appendNumberField(payload, payload_len, "lambda_b1s1", liveData.lambda_b1s1, 2, first);
      break;
    case 0x10:
      appendNumberField(payload, payload_len, "maf", liveData.maf, 2, first);
      break;
    case 0x04:
      appendNumberField(payload, payload_len, "load", liveData.load, 0, first);
      break;
    case 0x11:
      appendNumberField(payload, payload_len, "throttle", liveData.throttle, 0, first);
      break;
    case 0x49:
      appendNumberField(payload, payload_len, "accel_d", liveData.accel_d, 0, first);
      break;
    case 0x0D:
      appendNumberField(payload, payload_len, "vss", liveData.vss, 0, first);
      break;
    case 0x05:
      appendNumberField(payload, payload_len, "ect", liveData.ect, 0, first);
      break;
    case 0x0F:
      appendNumberField(payload, payload_len, "iat", liveData.iat, 0, first);
      break;
    case 0x78:
      appendNumberField(payload, payload_len, "egt", liveData.egt, 0, first);
      break;
    case 0x33:
      appendNumberField(payload, payload_len, "baro", liveData.baro, 0, first);
      break;
    case 0x2C:
      appendNumberField(payload, payload_len, "egr", liveData.egr, 0, first);
      break;
    case 0x2D:
      appendNumberField(payload, payload_len, "egr_error", liveData.egr_error, 0, first);
      break;
    case 0x2F:
      appendNumberField(payload, payload_len, "fuel_level", liveData.fuel_level, 0, first);
      break;
    case 0x7A:
      appendNumberField(payload, payload_len, "dpf_diff", liveData.dpf_diff, 1, first);
      break;
    case 0x42:
      appendNumberField(payload, payload_len, "battery", liveData.battery, 2, first);
      break;
    case 0x3C:
      appendNumberField(payload, payload_len, "cat_temp_b1s1", liveData.cat_temp_b1s1, 0, first);
      break;
    case 0x45:
      appendNumberField(payload, payload_len, "relative_throttle", liveData.relative_throttle, 0, first);
      break;
    case 0x46:
      appendNumberField(payload, payload_len, "ambient_temp", liveData.ambient_temp, 0, first);
      break;
    case 0x4C:
      appendNumberField(payload, payload_len, "cmd_throttle", liveData.cmd_throttle, 0, first);
      break;
    case 0x5C:
      appendNumberField(payload, payload_len, "oil_temp", liveData.oil_temp, 0, first);
      break;
    case 0x61:
      appendNumberField(payload, payload_len, "torque_demand", liveData.torque_demand, 0, first);
      break;
    case 0x62:
      appendNumberField(payload, payload_len, "torque_actual", liveData.torque_actual, 0, first);
      break;
    case 0x63:
      appendNumberField(payload, payload_len, "torque_reference", liveData.torque_reference, 0, first);
      break;
  }
}

void appendSystemFields(char* payload, size_t payload_len, bool& first) {
  appendNumberField(payload, payload_len, "can_rx_count", liveData.can_rx_count, 0, first);
  appendNumberField(payload, payload_len, "can_tx_count", liveData.can_tx_count, 0, first);
  appendNumberField(payload, payload_len, "can_error_count", liveData.can_error_count, 0, first);
  appendNumberField(payload, payload_len, "can_tx_error_count", liveData.can_tx_error_count, 0, first);
  appendNumberField(payload, payload_len, "can_rx_error_count", liveData.can_rx_error_count, 0, first);
  appendNumberField(payload, payload_len, "can_bus_error_count", liveData.can_bus_error_count, 0, first);
  appendNumberField(payload, payload_len, "can_tx_failed_count", liveData.can_tx_failed_count, 0, first);
  appendNumberField(payload, payload_len, "can_rx_missed_count", liveData.can_rx_missed_count, 0, first);
  appendNumberField(payload, payload_len, "can_arb_lost_count", liveData.can_arb_lost_count, 0, first);
  appendNumberField(payload, payload_len, "can_state", liveData.can_state, 0, first);
}

void buildAndSendJson() {
  char payload[1200];
  bool first = false;
  snprintf(payload, sizeof(payload), "{\"t_ms\":%lu", millis());

  for (uint8_t i = 0; i < num_active_pids; i++) {
    if (isAllowedLivePid(active_pids[i])) {
      appendPidField(payload, sizeof(payload), active_pids[i], first);
    }
  }

  appendSystemFields(payload, sizeof(payload), first);
  appendRawText(payload, sizeof(payload), "}");
  queueJson(payload);
}

void sendRawFrame(const twai_message_t& msg, const char* direction) {
  if (!raw_trace_enabled) return;
  uint32_t now = millis();
  bool validation_frame = isValidationRawFrame(msg.identifier);
  if (!validation_frame && now - last_raw_emit < 10) return;
  if (!validation_frame) last_raw_emit = now;

  char hex[17];
  hexEncode(msg.data, msg.data_length_code, hex, sizeof(hex));
  queueJsonf(
    "{\"raw\":{\"t\":%lu,\"id\":%lu,\"ext\":%d,\"dlc\":%d,\"data\":\"%s\",\"dir\":\"%s\",\"bus\":\"twai\"}}",
    now,
    msg.identifier,
    msg.extd ? 1 : 0,
    msg.data_length_code,
    hex,
    direction
  );
}

bool isValidationRawFrame(uint32_t id) {
  return id == 0x7DF || (id >= 0x7E0 && id <= 0x7EF);
}

void handleCommand(const CommandMessage& cmd) {
  if (cmd.type == CMD_SET_PIDS) {
    num_active_pids = 0;
    for (uint8_t i = 0; i < cmd.pid_count && num_active_pids < MAX_ACTIVE_PIDS; i++) {
      if (isAllowedLivePid(cmd.pids[i])) {
        active_pids[num_active_pids++] = cmd.pids[i];
      }
    }
    current_pid_index = 0;
    current_mode = MODE_LIVE;
    request_state.pending = false;
    queueJson("{\"status\":\"PID OK\"}");
  } else if (cmd.type == CMD_SET_RAW_TRACE) {
    raw_trace_enabled = cmd.raw_enabled;
    queueJsonf("{\"status\":\"RAW %s\"}", raw_trace_enabled ? "ON" : "OFF");
  } else if (cmd.type == CMD_IDENTIFY) {
    current_mode = MODE_OBD_ID;
    scan_idx = 0;
    isotp.active = false;
    request_state.pending = false;
  }
}

void handleNetworkCommands(const String& msg) {
  CommandMessage command;
  memset(&command, 0, sizeof(command));

  if (msg == "CMD:IDENTIFY") {
    command.type = CMD_IDENTIFY;
  } else if (msg.startsWith("CFG:RAW=")) {
    command.type = CMD_SET_RAW_TRACE;
    command.raw_enabled = msg.substring(8).toInt() == 1;
  } else if (msg.startsWith("CFG:")) {
    command.type = CMD_SET_PIDS;
    String list = msg.substring(4);
    int from_index = 0;
    while (from_index < list.length() && command.pid_count < MAX_ACTIVE_PIDS) {
      int to_index = list.indexOf(',', from_index);
      String pid_str = to_index == -1 ? list.substring(from_index) : list.substring(from_index, to_index);
      pid_str.trim();
      if (pid_str.length() > 0) {
        command.pids[command.pid_count++] = (uint8_t)strtol(pid_str.c_str(), NULL, 16);
      }
      if (to_index == -1) break;
      from_index = to_index + 1;
    }
  } else {
    return;
  }

  xQueueSend(commandQueue, &command, 0);
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  if (type == WStype_CONNECTED) {
    queueJson("{\"status\":\"Gateway connected\"}");
    return;
  }

  if (type == WStype_DISCONNECTED) {
    queueJson("{\"status\":\"Gateway disconnected\"}");
    return;
  }

  if (type != WStype_TEXT) return;

  String msg;
  msg.reserve(length);
  for (size_t i = 0; i < length; i++) msg += (char)payload[i];
  handleNetworkCommands(msg);
}

void queueJson(const char* payload) {
  if (!outboundQueue) return;
  OutboundMessage msg;
  memset(&msg, 0, sizeof(msg));
  strncpy(msg.payload, payload, sizeof(msg.payload) - 1);
  xQueueSend(outboundQueue, &msg, 0);
}

void queueJsonf(const char* fmt, ...) {
  if (!outboundQueue) return;
  OutboundMessage msg;
  memset(&msg, 0, sizeof(msg));
  va_list args;
  va_start(args, fmt);
  vsnprintf(msg.payload, sizeof(msg.payload), fmt, args);
  va_end(args);
  xQueueSend(outboundQueue, &msg, 0);
}

void queueDebug(const String& msg) {
  char clean[220];
  msg.toCharArray(clean, sizeof(clean));
  sanitizeString(clean);
  queueJsonf("{\"debug\":\"%s\"}", clean);
  Serial.println(clean);
}

void sanitizeString(char* str) {
  uint16_t write_idx = 0;
  for (uint16_t i = 0; str[i] != '\0'; i++) {
    if (str[i] >= 32 && str[i] <= 126 && str[i] != '"' && str[i] != '\\') {
      str[write_idx++] = str[i];
    }
  }
  str[write_idx] = '\0';
}

void hexEncode(const uint8_t* data, uint16_t len, char* out, uint16_t out_len) {
  uint16_t max_bytes = (out_len - 1) / 2;
  uint16_t count = min(len, max_bytes);
  for (uint16_t i = 0; i < count; i++) {
    snprintf(&out[i * 2], out_len - (i * 2), "%02X", data[i]);
  }
  out[count * 2] = '\0';
}

void jsonNumber(char* out, size_t out_len, float value, uint8_t decimals) {
  if (isnan(value) || isinf(value)) {
    strncpy(out, "null", out_len);
    out[out_len - 1] = '\0';
    return;
  }

  char fmt[8];
  snprintf(fmt, sizeof(fmt), "%%.%df", decimals);
  snprintf(out, out_len, fmt, value);
}

bool isAllowedLivePid(uint8_t pid) {
  switch (pid) {
    case 0x0C: // Engine RPM
    case 0x0B: // Intake manifold absolute pressure
    case 0x23: // Fuel rail gauge pressure
    case 0x24: // O2 sensor 1 equivalence ratio
    case 0x10: // Mass air flow
    case 0x04: // Calculated engine load
    case 0x11: // Throttle position
    case 0x49: // Accelerator pedal position D
    case 0x0D: // Vehicle speed
    case 0x05: // Engine coolant temperature
    case 0x0F: // Intake air temperature
    case 0x78: // Exhaust gas temperature bank 1
    case 0x33: // Barometric pressure
    case 0x2C: // Commanded EGR
    case 0x2D: // EGR error
    case 0x2F: // Fuel tank level input
    case 0x7A: // DPF differential pressure bank 1
    case 0x42: // Control module voltage
    case 0x3C: // Catalyst temperature bank 1 sensor 1
    case 0x45: // Relative throttle position
    case 0x46: // Ambient air temperature
    case 0x4C: // Commanded throttle actuator
    case 0x5C: // Engine oil temperature
    case 0x61: // Driver demand engine torque
    case 0x62: // Actual engine torque
    case 0x63: // Engine reference torque
      return true;
    default:
      return false;
  }
}
