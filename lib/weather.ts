interface WeatherData {
  temperature: number
  condition: string
  description: string
  humidity: number
  windSpeed: number
  city: string
  icon: string
}

export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherData | null> {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
  
  if (!apiKey) {
    console.error("OpenWeather API key yok!")
    return null
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=tr`
    )

    if (!response.ok) {
      throw new Error("Hava durumu alinamadi")
    }

    const data = await response.json()

    return {
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      city: data.name,
      icon: data.weather[0].icon
    }
  } catch (error) {
    console.error("Hava durumu hatasi:", error)
    return null
  }
}

export async function getWeatherByCity(city: string): Promise<WeatherData | null> {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
  
  if (!apiKey) {
    console.error("OpenWeather API key yok!")
    return null
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=tr`
    )

    if (!response.ok) {
      throw new Error("Hava durumu alinamadi")
    }

    const data = await response.json()

    return {
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      city: data.name,
      icon: data.weather[0].icon
    }
  } catch (error) {
    console.error("Hava durumu hatasi:", error)
    return null
  }
}

export function getWeatherCategory(temp: number): "hot" | "warm" | "cool" | "cold" {
  if (temp >= 25) return "hot"
  if (temp >= 18) return "warm"
  if (temp >= 10) return "cool"
  return "cold"
}

export function getWeatherIcon(condition: string) {
  switch(condition.toLowerCase()) {
    case "clear":
      return "☀️"
    case "clouds":
      return "☁️"
    case "rain":
    case "drizzle":
      return "🌧️"
    case "thunderstorm":
      return "⛈️"
    case "snow":
      return "❄️"
    case "mist":
    case "fog":
      return "🌫️"
    default:
      return "🌤️"
  }
}