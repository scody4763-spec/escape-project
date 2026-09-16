idf_component_register(
    SRCS "main.cpp"
    INCLUDE_DIRS "."
    REQUIRES
        driver esp_wifi esp_netif esp_event nvs_flash json
        BSP DHT20 ENS160 Mesh LED_Matrix
)
