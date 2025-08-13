// script.js

const weatherBgColor = (code) => {
    switch (code) {
        case 0: // 晴れ
        case 1: // 主に晴れ
            return 'lightyellow';
        case 2: // 曇り
            return 'lightgray';
        case 3: // 厚い雲
            return 'gray';
        case 45: case 48: // 霧
            return 'silver';
        case 51: case 53: case 55: // 小雨
            return 'lightblue';
        case 61: case 63: case 65: // 雨
            return 'blue';
        case 71: case 73: case 75: // 雪
            return 'white';
        default:
            return 'white';
    }
};

const pressureDotColor = (value) => {
    if (value >= 1020) return 'blue';
    if (value >= 1005) return 'orange';
    return 'red';
};

async function fetchWeatherAndPressure() {
    try {
        const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=35.6895&longitude=139.6917&hourly=weathercode,surface_pressure&timezone=Asia/Tokyo';
        const response = await fetch(weatherUrl);
        if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
        const data = await response.json();

        if (!data.hourly || !data.hourly.time) {
            console.error('Weather data format unexpected:', data);
            return;
        }

        const times = data.hourly.time.map(t => new Date(t));
        const pressures = data.hourly.surface_pressure;
        const weatherCodes = data.hourly.weathercode;

        drawPressureChart(times, pressures, weatherCodes);
    } catch (err) {
        console.error(err);
    }
}

function drawPressureChart(times, pressures, weatherCodes) {
    const ctx = document.getElementById('pressureChart').getContext('2d');

    const datasets = [{
        label: '気圧 (hPa)',
        data: pressures,
        borderColor: 'black',
        backgroundColor: pressures.map(v => pressureDotColor(v)),
        pointRadius: 5,
        fill: false,
        tension: 0.1
    }];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: times.map(t => t.toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: 'numeric' })),
            datasets
        },
        options: {
            plugins: {
                legend: { display: true }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 90,
                        minRotation: 45
                    },
                    grid: {
                        color: (ctx) => {
                            const code = weatherCodes[ctx.index];
                            return weatherBgColor(code);
                        }
                    }
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', fetchWeatherAndPressure);
