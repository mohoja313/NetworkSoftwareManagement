package com.networksoftware.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.networksoftware.entity.OtpCode;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {

  Optional<OtpCode> findByEmail(String email);

  void deleteByEmail(String email);
}
