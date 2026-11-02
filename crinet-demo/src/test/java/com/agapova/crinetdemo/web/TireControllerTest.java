package com.agapova.crinetdemo.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TireControllerTest {

    @Autowired
    MockMvc mvc;

    @Test
    void listsSampleTires() throws Exception {
        mvc.perform(get("/api/tires"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[*].code", hasItem("TC-205")));
    }

    @Test
    void returnsCostBreakdown() throws Exception {
        mvc.perform(get("/api/tires/TC-205/cost"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", greaterThan(0.0)))
                .andExpect(jsonPath("$.materialLines", hasSize(7)));
    }

    @Test
    void unknownTireGives404() throws Exception {
        mvc.perform(get("/api/tires/NOPE/cost")).andExpect(status().isNotFound());
    }

    @Test
    void simulatesScenario() throws Exception {
        mvc.perform(post("/api/tires/TC-205/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"materialPriceChange\":{\"NATURAL_RUBBER\":0.2},\"energyPriceChange\":0.5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.delta", greaterThan(0.0)));
    }

    @Test
    void invalidScenarioGives400() throws Exception {
        mvc.perform(post("/api/tires/TC-205/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"energyPriceChange\":-2}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sensitivityRejectsOutOfRangeVariation() throws Exception {
        mvc.perform(get("/api/tires/TC-205/sensitivity").param("variation", "1.5"))
                .andExpect(status().isBadRequest());
    }
}
