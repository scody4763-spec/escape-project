package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Test what the existing hash corresponds to
	existingHash := "$2a$10$4nWSwTZflUKOYhnw4XIej.dtGTkzeOAEBvFCs89OPkK4nrB47WhUm"
	
	passwords := []string{"admin123", "admin1234", "admin", "123456", "password", "Admin1234", "admin12345"}
	
	for _, pw := range passwords {
		err := bcrypt.CompareHashAndPassword([]byte(existingHash), []byte(pw))
		if err == nil {
			fmt.Printf("MATCH FOUND: hash = %s, password = %s\n", existingHash, pw)
		}
	}
	
	// Generate a new hash for admin1234 and compare
	hash, _ := bcrypt.GenerateFromPassword([]byte("admin1234"), bcrypt.DefaultCost)
	fmt.Printf("\nNew hash for 'admin1234': %s\n", string(hash))
	fmt.Printf("Same as existing? %v\n", string(hash) == existingHash)
	
	// Also generate for admin123
	hash2, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	fmt.Printf("New hash for 'admin123': %s\n", string(hash2))
}
