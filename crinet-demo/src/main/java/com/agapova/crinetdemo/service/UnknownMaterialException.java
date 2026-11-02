package com.agapova.crinetdemo.service;

public class UnknownMaterialException extends RuntimeException {
    public UnknownMaterialException(String code) {
        super("Unknown material: " + code);
    }
}
