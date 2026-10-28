// WMO weather codes → label + emoji icon
const WMO = {
    0: { label: 'Clear Sky', icon: '☀️' },
    1: { label: 'Mainly Clear', icon: '🌤️' },
    2: { label: 'Partly Cloudy', icon: '⛅' },
    3: { label: 'Overcast', icon: '☁️' },
    45: { label: 'Foggy', icon: '🌫️' },
    48: { label: 'Icy Fog', icon: '🌫️' },
    51: { label: 'Light Drizzle', icon: '🌦️' },
    53: { label: 'Moderate Drizzle', icon: '🌦️' },
    55: { label: 'Dense Drizzle', icon: '🌧️' },
    61: { label: 'Light Rain', icon: '🌧️' },
    63: { label: 'Rain', icon: '🌧️' },
    65: { label: 'Heavy Rain', icon: '🌧️' },
    71: { label: 'Light Snow', icon: '🌨️' },
    73: { label: 'Snow', icon: '❄️' },
    75: { label: 'Heavy Snow', icon: '❄️' },
    77: { label: 'Snow Grains', icon: '🌨️' },
    80: { label: 'Light Showers', icon: '🌦️' },
    81: { label: 'Showers', icon: '🌧️' },
    82: { label: 'Violent Showers', icon: '⛈️' },
    85: { label: 'Snow Showers', icon: '🌨️' },
    86: { label: 'Heavy Snow Showers', icon: '❄️' },
    95: { label: 'Thunderstorm', icon: '⛈️' },
    96: { label: 'Thunderstorm w/ Hail', icon: '⛈️' },
    99: { label: 'Thunderstorm Heavy Hail', icon: '⛈️' }
};

let weatherFetched = false;

async function fetchWeatherData(lat, lon, fallbackCity = null) {
    try {
        const wRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&forecast_days=6` +
            `&wind_speed_unit=kmh&timezone=auto`
        );
        if (!wRes.ok) throw new Error('Weather HTTP ' + wRes.status);
        const wData = await wRes.json();
        if (!wData || !wData.current) throw new Error('Malformed weather response');
        const c = wData.current;

        let cityName = fallbackCity || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
        if (!fallbackCity) {
            try {
                const gRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
                const gData = await gRes.json();
                cityName = gData.city || gData.locality || gData.principalSubdivision || cityName;
            } catch (_) { }
        }

        const wmo = WMO[c.weather_code] || { label: 'Unknown', icon: '🌡️' };
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('weatherIconBig', wmo.icon);
        set('weatherTempBig', Math.round(c.temperature_2m));
        set('weatherCity', cityName);
        set('weatherDesc', wmo.label);
        set('weatherFeels', Math.round(c.apparent_temperature) + '°C');
        set('weatherHumidity', c.relative_humidity_2m + '%');
        set('weatherWind', Math.round(c.wind_speed_10m));
        set('weatherUV', c.uv_index !== undefined ? c.uv_index.toFixed(1) : '--');
        set('weatherUpdated', 'Updated ' +
            new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

        document.getElementById('weatherLoading').style.display = 'none';
        document.getElementById('weatherContent').style.display = 'flex';
        weatherFetched = true;
        if (window.FlowEnh) FlowEnh.renderWeatherExtra(wData, WMO, cityName);
    } catch (e) {
        showWeatherError('Failed to fetch weather data. Check your connection and try again.');
    }
}

async function fetchWeatherIPFallback() {
    try {
        const res = await fetch('https://ipwho.is/');
        if (!res.ok) throw new Error('ip fallback failed');
        const data = await res.json();
        if (data.success) fetchWeatherData(data.latitude, data.longitude, data.city);
        else throw new Error('ip fallback failed');
    } catch (e) {
        showWeatherError('Location access denied. Please allow location in your browser settings.');
    }
}

function fetchWeather() {
    const show = (id, mode) => { const el = document.getElementById(id); if (el) el.style.display = mode; };
    show('weatherLoading', 'flex');
    show('weatherError', 'none');
    show('weatherContent', 'none');

    if (!navigator.geolocation) {
        fetchWeatherIPFallback();
        return;
    }
    navigator.geolocation.getCurrentPosition(
        pos => fetchWeatherData(pos.coords.latitude, pos.coords.longitude),
        err => fetchWeatherIPFallback(),
        { timeout: 10000 }
    );
}

function showWeatherError(msg) {
    const show = (id, mode) => { const el = document.getElementById(id); if (el) el.style.display = mode; };
    show('weatherLoading', 'none');
    show('weatherContent', 'none');
    show('weatherError', 'flex');
    const msgEl = document.getElementById('weatherErrorMsg');
    if (msgEl) msgEl.textContent = msg;
}

export const WeatherModule = {
    get weatherFetched() { return weatherFetched; },
    fetchWeather, // always refetches — the panel's Refresh button and dashboard both use it
    showWeatherError
};
