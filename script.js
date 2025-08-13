// script.js
document.addEventListener("DOMContentLoaded", () => {
    const pressureCanvas = document.getElementById("pressureChart");
    const healthCanvas = document.getElementById("healthChart");

    const pressureBtn = document.getElementById("showPressure");
    const healthBtn = document.getElementById("showHealth");

    let pressureChart, healthChart;

    const lat = 35.6895; // 東京
    const lon = 139.6917;

    // 天気ごとの背景色設定
    const weatherColors = {
        clear: "rgba(255, 255, 150, 0.2)", // 晴れ
        clouds: "rgba(200, 200, 200, 0.2)", // 曇り
        rain: "rgba(150, 150, 255, 0.2)",   // 雨
        default: "rgba(255, 255, 255, 0.0)" // デフォルト
    };

    // ダミー体調データ（テスト用）
    const healthData = [
        3, 4, 5, 6, 4, 3, 2, 5, 6, 4,
        5, 4, 3, 2, 5, 6, 4, 3, 2, 5,
        6, 4, 5, 4, 3, 2, 5, 6, 4, 3
    ];

    async function fetchData() {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=pressure_msl,weathercode&timezone=Asia/Tokyo`;
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`API取得エラー: ${res.status}`);
        }
        return res.json();
    }

    function getWeatherType(code) {
        if ([0].includes(code)) return "clear";     // 晴れ
        if ([1, 2, 3].includes(code)) return "clouds"; // 曇り
        if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "rain"; // 雨
        return "default";
    }

    function createPressureChart(labels, pressures, weatherCodes) {
        if (pressureChart) pressureChart.destroy();

        const bgColors = labels.map((_, i) => {
            const type = getWeatherType(weatherCodes[i]);
            return weatherColors[type] || weatherColors.default;
        });

        pressureChart = new Chart(pressureCanvas, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "気圧 (hPa)",
                    data: pressures,
                    borderColor: "blue",
                    fill: false,
                    tension: 0.1,
                    yAxisID: "y"
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                },
                plugins: {
                    tooltip: {
                        mode: "index",
                        intersect: false
                    },
                    backgroundZones: { colors: bgColors }
                }
            },
            plugins: [{
                id: "backgroundZones",
                beforeDraw(chart, args, options) {
                    const { ctx, chartArea: { left, right, top, bottom }, scales: { x } } = chart;
                    const colors = options.colors || [];
                    ctx.save();
                    colors.forEach((color, i) => {
                        const start = x.getPixelForValue(i);
                        const end = x.getPixelForValue(i + 1);
                        ctx.fillStyle = color;
                        ctx.fillRect(start, top, end - start, bottom - top);
                    });
                    ctx.restore();
                }
            }]
        });
    }

    function createHealthChart(labels, healthScores) {
        if (healthChart) healthChart.destroy();

        healthChart = new Chart(healthCanvas, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "体調スコア",
                    data: healthScores,
                    borderColor: "green",
                    backgroundColor: "rgba(0, 255, 0, 0.2)",
                    fill: true,
                    tension: 0.3,
                    yAxisID: "y"
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax: 10
                    }
                }
            }
        });
    }

    // 初期表示
    fetchData()
        .then(data => {
            const labels = data.hourly.time.map(t => t.slice(5, 16)); // "MM-DD HH:00"
            const pressures = data.hourly.pressure_msl;
            const weatherCodes = data.hourly.weathercode;

            createPressureChart(labels, pressures, weatherCodes);
            createHealthChart(labels.slice(0, healthData.length), healthData);
        })
        .catch(err => {
            console.error("データ取得エラー", err);
        });

    // ボタン切り替え
    pressureBtn.addEventListener("click", () => {
        pressureCanvas.style.display = "block";
        healthCanvas.style.display = "none";
    });

    healthBtn.addEventListener("click", () => {
        pressureCanvas.style.display = "none";
        healthCanvas.style.display = "block";
    });
});
