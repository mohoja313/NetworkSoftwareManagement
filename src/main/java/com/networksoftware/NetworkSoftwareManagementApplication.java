package com.networksoftware;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import com.networksoftware.config.AppProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class NetworkSoftwareManagementApplication {

  public static void main(String[] args) {
    SpringApplication.run(NetworkSoftwareManagementApplication.class, args);
  }
}
