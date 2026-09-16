# 自动搜集 BSP 目录下所有子文件夹的 .c 文件
file(GLOB_RECURSE SOURCES "*.c")

# 注册组件
idf_component_register(
    SRCS ${SOURCES}
    INCLUDE_DIRS
        "ADC"
        "GPIO"
        "I2C"
		"WIFI"
		"PWM"
    REQUIRES driver esp_adc esp_wifi nvs_flash mqtt esp_http_client lwip json esp_partition app_update# 依赖 IDF 原生驱动
)
component_compile_options(-ffast-math -O3 -Wno-error=format=-Wno-format)