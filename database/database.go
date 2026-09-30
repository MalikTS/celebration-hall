package database

import (
	"log"
	"time"

	"celebration-hall/config"
	"celebration-hall/models"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	var err error
	DB, err = gorm.Open(sqlite.Open(config.DatabasePath), &gorm.Config{})
	if err != nil {
		log.Fatal("Ошибка подключения к базе данных: ", err)
	}

	err = DB.AutoMigrate(&models.User{}, &models.Event{}, &models.Booking{})
	if err != nil {
		log.Fatal("Ошибка миграции базы данных: ", err)
	}

	seedEvents()
	log.Println("База данных успешно подключена и мигрирована.")
}

func seedEvents() {
	var count int64
	DB.Model(&models.Event{}).Count(&count)
	
	if count == 0 {
		events := []models.Event{
			{
				Title:       "Свадебная церемония",
				Description: "Классическое проведение свадебного торжества в главном зале.",
				Date:        time.Now().AddDate(0, 1, 0),
				Capacity:    1,
			},
			{
				Title:       "Юбилей 50 лет",
				Description: "Организация юбилейного вечера с ведущим и банкетом.",
				Date:        time.Now().AddDate(0, 0, 15),
				Capacity:    1,
			},
			{
				Title:       "Корпоративное мероприятие",
				Description: "Проведение корпоратива компании с развлекательной программой.",
				Date:        time.Now().AddDate(0, 0, 20),
				Capacity:    1,
			},
			{
				Title:       "Выпускной вечер",
				Description: "Торжественное проведение выпускного вечера для студентов.",
				Date:        time.Now().AddDate(0, 2, 0),
				Capacity:    1,
			},
		}
		
		for _, event := range events {
			DB.Create(&event)
		}
		log.Println("Тестовые мероприятия успешно добавлены в базу данных.")
	}
}