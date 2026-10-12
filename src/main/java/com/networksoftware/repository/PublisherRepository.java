package com.networksoftware.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.networksoftware.entity.Publisher;

public interface PublisherRepository extends JpaRepository<Publisher, Long> {

  Optional<Publisher> findByEmail(String email);
}
