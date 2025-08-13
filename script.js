// 天気コードごとの背景色
const weatherBgColor = (code) => {
    switch (code) {
        case 0: case 1: // 晴れ
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

// 気圧のドット色
const pressureDotColor = (value) => {
    if (value >= 1020) return 'blue';
    if (value >= 1005) return 'orange';
    return 'red';
};

// 天気・気圧データ取得
async function fetchWeatherAndPressure() {
    try {
        const weatherUrl =
            'https://api.open-meteo.com/v1/forecast' +
            '?latitude=35.6895&longitude=139.6917' +
            '&hourly=weathercode,surface_pressure' +
            '&timezone=Asia/Tokyo';

        const response = await fetch(weatherUrl);
        if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
        const data = await response.json();

        if (!data.hourly || !data.hourly.time) {
            console.error('Unexpected data format:', data);
            return;
        }

        const times = data.hourly.time.map(t => new Date(t));
        const pressures = data.hourly.surface_pressure;
        const weatherCodes = data.hourly.weathercode;

        drawPressureChart(times, pressures, weatherCodes);
        fillWeatherTable(times, pressures, weatherCodes);

    } catch (err) {
        console.error(err);
    }
}

// 気圧グラフ描画
function drawPressureChart(times, pressures, weatherCodes) {
    const ctx = document.getElementById('pressureChart').getContext('2d');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: times.map(t =>
                t.toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: 'numeric' })
            ),
            datasets: [{
                label: '気圧 (hPa)',
                data: pressures,
                borderColor: 'black',
                backgroundColor: pressures.map(v => pressureDotColor(v)),
                pointBackgroundColor: pressures.map(v => pressureDotColor(v)),
                pointRadius: 5,
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            plugins: { legend: { display: true } },
            scales: {
                x: {
                    ticks: { maxRotation: 90, minRotation: 45 },
                    grid: {
                        color: (ctx) => weatherBgColor(weatherCodes[ctx.index])
                    }
                }
            }
        }
    });
}

// 表のデータ作成
function fillWeatherTable(times, pressures, weatherCodes) {
    const tbody = document.querySelector('#weatherTable tbody');
    tbody.innerHTML = '';

    times.forEach((time, i) => {
        const tr = document.createElement('tr');
        tr.style.backgroundColor = weatherBgColor(weatherCodes[i]);

        tr.innerHTML = `
            <td>${time.toLocaleString('ja-JP')}</td>
            <td>${pressures[i]}</td>
            <td>${weatherCodes[i]}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 表示切り替え処理
function setupToggleButtons() {
    const graphBtn = document.getElementById('showGraph');
    const tableBtn = document.getElementById('showTable');
    const graphSection = document.getElementById('graphSection');
    const tableSection = document.getElementById('tableSection');

    graphBtn.addEventListener('click', () => {
        graphBtn.classList.add('active');
        tableBtn.classList.remove('active');
        graphSection.style.display = 'block';
        tableSection.style.display = 'none';
    });

    tableBtn.addEventListener('click', () => {
        tableBtn.classList.add('active');
        graphBtn.classList.remove('active');
        graphSection.style.display = 'none';
        tableSection.style.display = 'block';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupToggleButtons();
    fetchWeatherAndPressure();
});
