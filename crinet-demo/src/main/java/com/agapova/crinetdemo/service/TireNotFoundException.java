package com.agapova.crinetdemo.service;

public class TireNotFoundException extends RuntimeException {
    public TireNotFoundException(String code) {
        super("Unknown tire: " + code);
    }
}
