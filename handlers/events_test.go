package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"celebration-hall/database"
	"celebration-hall/models"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestEventAvailability(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	sqlDB.SetMaxOpenConns(1)
	defer sqlDB.Close()
	previous := database.DB
	database.DB = db
	defer func() { database.DB = previous }()
	if err := db.AutoMigrate(&models.User{}, &models.Event{}, &models.Booking{}); err != nil {
		t.Fatal(err)
	}
	user := models.User{Username: "availability-test", Password: "unused"}
	if err := db.Create(&user).Error; err != nil {
		t.Fatal(err)
	}
	events := []models.Event{
		{Title: "Wedding", Capacity: 1},
		{Title: "Corporate", Capacity: 1},
		{Title: "Workshop", Capacity: 2},
	}
	if err := db.Create(&events).Error; err != nil {
		t.Fatal(err)
	}
	addBooking := func(eventID uint, day string) {
		t.Helper()
		date, err := time.Parse(time.RFC3339, day)
		if err != nil {
			t.Fatal(err)
		}
		if err := db.Create(&models.Booking{UserID: user.ID, EventID: eventID, FullName: "Private name", Phone: "Private phone", BookingDate: date}).Error; err != nil {
			t.Fatal(err)
		}
	}
	addBooking(events[0].ID, "2026-10-15T00:00:00Z")
	addBooking(events[0].ID, "2026-11-01T00:00:00Z")
	addBooking(events[2].ID, "2026-10-16T00:00:00Z")
	addBooking(events[2].ID, "2026-10-17T00:00:00Z")
	addBooking(events[2].ID, "2026-10-17T12:00:00Z")
	router := gin.New()
	router.GET("/events/:id/availability", GetEventAvailability)
	router.POST("/bookings", func(c *gin.Context) { c.Set("user_id", user.ID) }, CreateBooking)
	availability := func(id uint, month string) []string {
		t.Helper()
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, fmt.Sprintf("/events/%d/availability?month=%s", id, month), nil))
		if response.Code != http.StatusOK {
			t.Fatalf("availability: %d %s", response.Code, response.Body.String())
		}
		if strings.Contains(response.Body.String(), "Private") {
			t.Fatal("contact details leaked")
		}
		var data struct {
			BookedDates []string `json:"booked_dates"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &data); err != nil {
			t.Fatal(err)
		}
		if data.BookedDates == nil {
			t.Fatal("booked_dates must be an array")
		}
		return data.BookedDates
	}
	if got := availability(events[0].ID, "2026-10"); len(got) != 1 || got[0] != "2026-10-15" {
		t.Fatalf("month boundaries: %v", got)
	}
	if got := availability(events[1].ID, "2026-10"); len(got) != 0 {
		t.Fatalf("events must be independent: %v", got)
	}
	if got := availability(events[2].ID, "2026-10"); len(got) != 1 || got[0] != "2026-10-17" {
		t.Fatalf("capacity: %v", got)
	}
	for _, path := range []string{"/events/1/availability", "/events/1/availability?month=2026-13", "/events/1/availability?month=2026-1"} {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
		if response.Code != http.StatusBadRequest {
			t.Fatalf("invalid month: %s = %d", path, response.Code)
		}
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/events/99999/availability?month=2026-10", nil))
	if response.Code != http.StatusNotFound {
		t.Fatalf("missing event: %d", response.Code)
	}
	postBooking := func(eventID uint, date string) int {
		t.Helper()
		body := fmt.Sprintf(`{"event_id":%d,"full_name":"Test","phone":"+79991234567","booking_date":"%s"}`, eventID, date)
		response := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodPost, "/bookings", strings.NewReader(body))
		request.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(response, request)
		return response.Code
	}
	if code := postBooking(events[0].ID, "2026-10-15T12:00:00Z"); code != http.StatusConflict {
		t.Fatalf("occupied day: %d", code)
	}
	if code := postBooking(events[1].ID, "2026-10-15T12:00:00Z"); code != http.StatusCreated {
		t.Fatalf("independent event: %d", code)
	}
	if got := availability(events[1].ID, "2026-10"); len(got) != 1 || got[0] != "2026-10-15" {
		t.Fatalf("refresh after booking: %v", got)
	}
	if code := postBooking(events[2].ID, "2026-10-16T00:00:00Z"); code != http.StatusCreated {
		t.Fatalf("remaining capacity: %d", code)
	}
	if got := availability(events[2].ID, "2026-10"); len(got) != 2 {
		t.Fatalf("full capacity: %v", got)
	}
}