package com.networksoftware.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.networksoftware.entity.AppSetting;

public interface AppSettingRepository extends JpaRepository<AppSetting, String> {
}
