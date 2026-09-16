idf_component_register(
    SRCS "src/lte_mqtt.c"
    INCLUDE_DIRS "include"
    REQUIRES driver esp_event BSP
)
