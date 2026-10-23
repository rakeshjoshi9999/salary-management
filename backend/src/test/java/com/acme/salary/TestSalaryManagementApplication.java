package com.acme.salary;

import org.springframework.boot.SpringApplication;

public class TestSalaryManagementApplication {

	public static void main(String[] args) {
		SpringApplication.from(SalaryManagementApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
