package com.agapova.crinetdemo.model;

/** Grandes familles de matières premières d'un pneumatique. */
public enum MaterialCategory {
    NATURAL_RUBBER("caoutchouc naturel"),
    SYNTHETIC_RUBBER("caoutchouc synthétique"),
    FILLER("charges"),
    STEEL("acier"),
    TEXTILE("textile"),
    CHEMICALS("produits chimiques");

    private final String label;

    MaterialCategory(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
