#include "i2c_bus.h"
#include "esp_log.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// 全局I2C总线句柄
static i2c_master_bus_handle_t global_i2c_bus = NULL;

// 初始化 I2C 总线
esp_err_t I2c_Init_Bus(i2c_port_t port, gpio_num_t sda_pin, gpio_num_t scl_pin, uint32_t freq_hz, i2c_master_bus_handle_t *bus_handle) {
    i2c_master_bus_config_t bus_cfg = {
        .clk_source = I2C_CLK_SRC_DEFAULT,
        .i2c_port = port,
        .sda_io_num = sda_pin,
        .scl_io_num = scl_pin,
        .flags = {
            .enable_internal_pullup = true,
        }
    };
    
    esp_err_t ret = i2c_new_master_bus(&bus_cfg, bus_handle);
    if (ret == ESP_OK && bus_handle != NULL) {
        global_i2c_bus = *bus_handle; // 保存全局句柄
    }
    return ret;
}

// 添加 I2C 设备
esp_err_t I2c_Add_Device(i2c_master_bus_handle_t bus_handle, uint16_t dev_addr, uint32_t freq_hz, i2c_master_dev_handle_t *dev_handle) {
    i2c_device_config_t dev_cfg = {
        .dev_addr_length = I2C_ADDR_BIT_LEN_7,
        .device_address = dev_addr,
        .scl_speed_hz = freq_hz,
    };
    return i2c_master_bus_add_device(bus_handle, &dev_cfg, dev_handle);
}

// 写寄存器
esp_err_t I2c_Write_Reg(i2c_master_dev_handle_t dev_handle, uint8_t reg, uint8_t data) {
    uint8_t buf[2] = {reg, data};
    return i2c_master_transmit(dev_handle, buf, sizeof(buf), -1);
}

// 读寄存器
esp_err_t I2c_Read_Reg(i2c_master_dev_handle_t dev_handle, uint8_t reg, uint8_t *data) {
    return i2c_master_transmit_receive(dev_handle, &reg, 1, data, 1, -1);
}

// 读多字节
esp_err_t I2c_Read_Bytes(i2c_master_dev_handle_t dev_handle, uint8_t reg, uint8_t *buffer, size_t count) {
    return i2c_master_transmit_receive(dev_handle, &reg, 1, buffer, count, -1);
}

// 删除设备
esp_err_t I2c_Remove_Device(i2c_master_dev_handle_t dev_handle) {
    return i2c_master_bus_rm_device(dev_handle);
}

// 删除总线
esp_err_t I2c_Delete_Bus(i2c_master_bus_handle_t bus_handle) {
    return i2c_del_master_bus(bus_handle);
}

// 获取全局I2C总线句柄
i2c_master_bus_handle_t I2c_Get_Global_Bus_Handle(void) {
    return global_i2c_bus;
}

esp_err_t I2c_Write_Bytes(i2c_master_dev_handle_t dev_handle, uint8_t reg, uint8_t *buffer, size_t count) {
    uint8_t *temp_buf = (uint8_t *)malloc(count + 1);
    if (temp_buf == NULL) return ESP_ERR_NO_MEM;
    
    temp_buf[0] = reg;
    memcpy(&temp_buf[1], buffer, count);
    
    esp_err_t ret = i2c_master_transmit(dev_handle, temp_buf, count + 1, -1);
    free(temp_buf);
    return ret;
}

// 16-bit寄存器地址读单字 (MLX90640: 发送2字节地址 + 读取2字节数据)
esp_err_t I2c_Read_Reg16(i2c_master_dev_handle_t dev_handle, uint16_t reg, uint16_t *data)
{
    uint8_t reg_buf[2] = {(uint8_t)(reg >> 8), (uint8_t)(reg & 0xFF)};
    uint8_t data_buf[2] = {0};
    esp_err_t ret = i2c_master_transmit_receive(dev_handle, reg_buf, 2, data_buf, 2, -1);
    if (ret == ESP_OK && data != NULL)
    {
        *data = ((uint16_t)data_buf[0] << 8) | data_buf[1];
    }
    return ret;
}

// 16-bit寄存器地址写单字 (MLX90640: 发送2字节地址 + 2字节数据)
esp_err_t I2c_Write_Reg16(i2c_master_dev_handle_t dev_handle, uint16_t reg, uint16_t data)
{
    uint8_t buf[4] = {
        (uint8_t)(reg >> 8),
        (uint8_t)(reg & 0xFF),
        (uint8_t)(data >> 8),
        (uint8_t)(data & 0xFF)
    };
    return i2c_master_transmit(dev_handle, buf, 4, -1);
}

// 16-bit寄存器地址读多字节 (MLX90640: 发送2字节地址 + 读取N字节数据)
esp_err_t I2c_Read_Bytes16(i2c_master_dev_handle_t dev_handle, uint16_t reg, uint8_t *buffer, size_t count)
{
    uint8_t reg_buf[2] = {(uint8_t)(reg >> 8), (uint8_t)(reg & 0xFF)};
    return i2c_master_transmit_receive(dev_handle, reg_buf, 2, buffer, count, -1);
}