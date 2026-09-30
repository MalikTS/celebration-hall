package handlers

import (
	"net/http"
	"time"

	"celebration-hall/database"
	"celebration-hall/models"
	"github.com/gin-gonic/gin"
)

func GetEvents(c *gin.Context) {
	var events []models.Event
	database.DB.Find(&events)
	c.JSON(http.StatusOK, events)
}

func GetEventByID(c *gin.Context) {
	var event models.Event
	if err := database.DB.First(&event, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}
	c.JSON(http.StatusOK, event)
}


func GetEventAvailability(c *gin.Context) {
	start, err := time.Parse("2006-01", c.Query("month"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "month must use YYYY-MM format"})
		return
	}
	var event models.Event
	if err := database.DB.First(&event, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}
	end := start.AddDate(0, 1, 0)
	var bookings []models.Booking
	if err := database.DB.Select("booking_date").
		Where("event_id = ? AND booking_date >= ? AND booking_date < ?", event.ID, start, end).
		Find(&bookings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load availability"})
		return
	}
	counts := make(map[string]int)
	for _, booking := range bookings {
		counts[booking.BookingDate.UTC().Format("2006-01-02")]++
	}
	bookedDates := make([]string, 0)
	for day := start; day.Before(end); day = day.AddDate(0, 0, 1) {
		key := day.Format("2006-01-02")
		if counts[key] >= event.Capacity {
			bookedDates = append(bookedDates, key)
		}
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{"booked_dates": bookedDates})
}