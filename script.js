(async function(){
  const lat = 35.6895;
  const lon = 139.6917;

  // 今日の日付（API取得範囲）
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30); // 過去30日分

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = today.toISOString().split('T')[0];

  // API URL
  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${startDateStr}&end_date=${endDateStr}&hourly=pressure_msl&daily=weathercode&timezone=Asia%2FTokyo`;

  let json;
  try {
    const res = await fetch(apiUrl);
    if(!res.ok) {
      alert(`API取得失敗: ${res.status} ${res.statusText}`);
      return;
    }
    json = await res.json();
  } catch(e){
    alert("API取得時にエラーが発生しました。");
    console.error(e);
    return;
  }

  if(!json.hourly || !json.hourly.time){
    alert("APIレスポンスにhourlyデータがありません。");
    console.log(json);
    return;
  }

  // 日ごとに平均気圧を計算
  const times = json.hourly.time;
  const pressures = json.hourly.pressure_msl;
  const dailyDates = json.daily.time;
  const dailyWeatherCodes = json.daily.weathercode;

  const dailyMap = {};
  for(let i=0; i<times.length; i++){
    const d = times[i].split('T')[0];
    if(!dailyMap[d]) dailyMap[d] = [];
    dailyMap[d].push(pressures[i]);
  }

  const dailyData = Object.entries(dailyMap).map(([date, vals])=>{
    const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
    const widx = dailyDates.indexOf(date);
    const weathercode = widx >= 0 ? dailyWeatherCodes[widx] : null;
    return {date, avg: +avg.toFixed(1), weathercode};
  }).sort((a,b)=>a.date.localeCompare(b.date));

  // 体調スコアテキスト
  const scoreText = {1:'悪い',2:'やや悪い',3:'ふつう',4:'やや良い',5:'良い'};
  const storageKey = 'symptomData';
  let symptomData = {};
  try {
    const stored = localStorage.getItem(storageKey);
    if(stored) symptomData = JSON.parse(stored);
  } catch(e){console.warn('localStorage読み込み失敗', e);}

  function saveSymptomData(){
    localStorage.setItem(storageKey, JSON.stringify(symptomData));
  }

  function getWeekday(dateStr){
    const days = ['日','月','火','水','木','金','土'];
    return days[new Date(dateStr).getDay()];
  }

  // 天気コード→背景色
  function weatherCodeToColor(code){
    if(code === null) return 'transparent';
    if([0].includes(code)) return '#fff9c4';  // 晴れ：薄黄色
    if([1,2,3].includes(code)) return '#cfd8dc';  // 曇り：薄グレー
    if([45,48].includes(code)) return '#b0bec5';  // 霧・霧雨
    if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return '#90caf9'; // 雨系：薄青
    if([71,73,75,77,85,86].includes(code)) return '#81d4fa'; // 雪系：薄水色
    return 'transparent';
  }

  // テーブル描画
  const tbody = document.getElementById('dataBody');
  function renderTable(){
    tbody.innerHTML = '';
    const todayStr = new Date().toISOString().split('T')[0];
    dailyData.forEach((d,i) => {
      const tr = document.createElement('tr');
      if(d.date === todayStr) tr.classList.add('today');

      const dateTd = document.createElement('td');
      dateTd.textContent = `${d.date}（${getWeekday(d.date)}）`;

      const avgTd = document.createElement('td');
      avgTd.textContent = d.avg;

      const symptomTd = document.createElement('td');
      const select = document.createElement('select');
      select.classList.add('bodySelect');
      [1,2,3,4,5].forEach(v=>{
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = `${v} (${scoreText[v]})`;
        select.appendChild(opt);
      });
      select.value = symptomData[d.date]?.score ?? 3;
      select.addEventListener('change', e => {
        if(!symptomData[d.date]) symptomData[d.date] = {};
        symptomData[d.date].score = Number(e.target.value);
        saveSymptomData();
      });
      symptomTd.appendChild(select);

      const memoTd = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.classList.add('memoInput');
      input.maxLength = 100;
      input.placeholder = 'メモ（100字以内）';
      input.value = symptomData[d.date]?.memo ?? '';
      input.addEventListener('input', e => {
        if(!symptomData[d.date]) symptomData[d.date] = {};
        symptomData[d.date].memo = e.target.value;
        saveSymptomData();
      });
      memoTd.appendChild(input);

      const weatherTd = document.createElement('td');
      weatherTd.style.backgroundColor = weatherCodeToColor(d.weathercode);
      weatherTd.textContent = d.weathercode !== null ? d.weathercode : '-';

      tr.appendChild(dateTd);
      tr.appendChild(avgTd);
      tr.appendChild(symptomTd);
      tr.appendChild(memoTd);
      tr.appendChild(weatherTd);

      tbody.appendChild(tr);
    });
  }

  // グラフ作成
  const ctx = document.getElementById('pressureChart').getContext('2d');
  let chart = null;

  function renderChart(){
    const labels = dailyData.map(d => d.date.split('-')[2] + '日');
    const dataPoints = dailyData.map(d => d.avg);
    const bgColors = dailyData.map(d => weatherCodeToColor(d.weathercode));

    const symptomColors = dailyData.map(d => {
      const score = symptomData[d.date]?.score ?? 3;
      switch(score){
        case 1: return '#d32f2f'; // 赤
        case 2: return '#f57c00'; // オレンジ
        case 3: return '#666';    // グレー
        case 4: return '#388e3c'; // 緑
        case 5: return '#1976d2'; // 青
        default: return '#666';
      }
    });

    const weatherBgPlugin = {
      id: 'weatherBgPlugin',
      beforeDraw(chart) {
        const { ctx, chartArea: { left, right, top, bottom }, scales: { x } } = chart;
        const count = labels.length;
        const bandWidth = (right - left) / count;
        ctx.save();
        for(let i = 0; i < count; i++){
          ctx.fillStyle = bgColors[i] || 'transparent';
          ctx.fillRect(left + bandWidth*i, top, bandWidth, bottom - top);
        }
        ctx.restore();
      }
    };

    if(chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '平均気圧 (hPa)',
          data: dataPoints,
          borderColor: '#36a2eb',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: symptomColors
        }]
      },
      options: {
        scales: {
          y: {
            suggestedMin: Math.min(...dataPoints) - 5,
            suggestedMax: Math.max(...dataPoints) + 5,
            title: { display: true, text: '気圧 (hPa)' }
          }
        },
        plugins: {
          legend: { display: true }
        }
      },
      plugins: [weatherBgPlugin]
    });
  }

  // ボタン切替
  const btnGraph = document.getElementById('btnGraph');
  const btnTable = document.getElementById('btnTable');
  const chartContainer = document.getElementById('chartContainer');
  const tableContainer = document.getElementById('tableContainer');

  btnGraph.addEventListener('click', ()=>{
    chartContainer.style.display = 'block';
    tableContainer.style.display = 'none';
  });
  btnTable.addEventListener('click', ()=>{
    chartContainer.style.display = 'none';
    tableContainer.style.display = 'block';
  });

  // 初期表示
  renderChart();
  renderTable();

  // 最初はグラフ表示
  chartContainer.style.display = 'block';
  tableContainer.style.display = 'none';

})();
