package handlers

import (
	"net/http"
	"time"

	"celebration-hall/database"
	"celebration-hall/models"

	"github.com/gin-gonic/gin"
)

type BookingInput struct {
	EventID     uint      `json:"event_id" binding:"required"`
	FullName    string    `json:"full_name" binding:"required"`
	Phone       string    `json:"phone" binding:"required"`
	BookingDate time.Time `json:"booking_date" binding:"required"`
}

func CreateBooking(c *gin.Context) {
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDInterface.(uint)

	var input BookingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var event models.Event
	if err := database.DB.First(&event, input.EventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}

	input.BookingDate = time.Date(input.BookingDate.UTC().Year(), input.BookingDate.UTC().Month(), input.BookingDate.UTC().Day(), 0, 0, 0, 0, time.UTC)
	var existingBookingsCount int64
	countResult := database.DB.Model(&models.Booking{}).
		Where("event_id = ? AND booking_date >= ? AND booking_date < ?", input.EventID, input.BookingDate, input.BookingDate.AddDate(0, 0, 1)).
		Count(&existingBookingsCount)

	if countResult.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check availability"})
		return
	}

	if existingBookingsCount >= int64(event.Capacity) {
		c.JSON(http.StatusConflict, gin.H{"error": "no available capacity for this date"})
		return
	}

	booking := models.Booking{
		UserID:      userID,
		EventID:     input.EventID,
		FullName:    input.FullName,
		Phone:       input.Phone,
		BookingDate: input.BookingDate,
	}

	if result := database.DB.Create(&booking); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create booking"})
		return
	}

	c.JSON(http.StatusCreated, booking)
}

func GetMyBookings(c *gin.Context) {
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDInterface.(uint)

	var bookings []models.Booking
	database.DB.Preload("Event").Where("user_id = ?", userID).Find(&bookings)

	c.JSON(http.StatusOK, bookings)
}
