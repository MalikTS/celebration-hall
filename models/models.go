package models

import (
    "time"
)

type User struct {
    ID       uint   `gorm:"primaryKey" json:"id"`
    Username string `gorm:"unique;not null" json:"username"`
    Password string `gorm:"not null" json:"-"` 
}

type Event struct {
    ID          uint      `gorm:"primaryKey" json:"id"`
    Title       string    `gorm:"not null" json:"title"`
    Description string    `json:"description"`
    Date        time.Time `json:"date"`
    Capacity    int       `gorm:"default:1" json:"capacity"` 
}

type Booking struct {
    ID            uint      `gorm:"primaryKey" json:"id"`
    UserID        uint      `gorm:"not null" json:"user_id"`
    EventID       uint      `gorm:"not null" json:"event_id"`
    FullName      string    `gorm:"not null" json:"full_name"`
    Phone         string    `gorm:"not null" json:"phone"`
    BookingDate   time.Time `gorm:"not null" json:"booking_date"` 
    User          User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
    Event         Event     `gorm:"foreignKey:EventID" json:"event,omitempty"`
}