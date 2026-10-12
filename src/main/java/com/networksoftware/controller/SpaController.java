package com.networksoftware.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** Forwards SPA routes to the bundled frontend so deep links work. */
@Controller
public class SpaController {

  @GetMapping({"/browse", "/upload", "/publishers", "/publishers/{id}", "/software/{id}"})
  public String spa() {
    return "forward:/index.html";
  }
}
