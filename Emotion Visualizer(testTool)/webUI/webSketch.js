let mic;
let fft;
let emotions = ['Calm', 'Happy', 'Sad', 'Angry'];
let emotionColors = [
  [141, 211, 199],  // Calm
  [255, 255, 141],  // Happy
  [190, 186, 218],  // Sad
  [251, 128, 114]   // Angry
];

let emotionParameters = [
  { pulseSpeed: 0.5, complexity: 1, amplitude: 5 },   // Calm
  { pulseSpeed: 2.0, complexity: 3, amplitude: 15 },  // Happy
  { pulseSpeed: 0.8, complexity: 2, amplitude: 8 },   // Sad
  { pulseSpeed: 2.5, complexity: 4, amplitude: 20 }   // Angry
];

let backgroundColors = [
  [20,20,20],    // Calm
  [182, 164, 118],  // Happy
  [74, 81, 100],    // Sad
  [140, 75, 49]     // Angry
];
let currentBackgroundColor = [0, 0, 0];

//emotion
let prevEmotion = 0;
let emotionTransition = 0;
let soundHistory = [];
const HISTORY_LENGTH = 10;

//filter
const NOISE_THRESHOLD = 40;
const SMOOTH_FACTOR = 0.8;
let smoothedBass = 0;
let smoothedMid = 0;
let smoothedTreble = 0;

//UI
let spectrumCanvas;
let spectrumCtx;

//print time
let lastCaptureTime = 0;
let calmStartTime = 0;
let calmDuration = 0;
const CAPTURE_INTERVAL = 2000;

const MAX_CALM_DURATION = 180000; //auto-stop

let VOLUME_THRESHOLD = 40; 
let audioStarted = false; 


//save
// let isSaving = false;
let isRecording = false;

function filterNoise(volume, bass, mid, treble) {
    if (volume < NOISE_THRESHOLD) {
      return {
        bass: 0,
        mid: 0, 
        treble: 0,
        volume: 0
      };
    }
    return {
      bass,
      mid,
      treble,
      volume
    };
  }

  function smoothSignal(currentValue, smoothedValue) {
    return SMOOTH_FACTOR * smoothedValue + (1 - SMOOTH_FACTOR) * currentValue;
  }



function setup() {
  //Create main canvas in visualization div
  const visDiv = document.getElementById('visualization');
  const canvas = createCanvas(visDiv.offsetWidth, visDiv.offsetHeight);
  canvas.parent('visualization');

  userStartAudio();
  audioStarted = false; 

//   //input
//   mic = new p5.AudioIn();
//   mic.start();
//   fft = new p5.FFT();
//   fft.setInput(mic);



  //Initialize sound history
  for(let i = 0; i < HISTORY_LENGTH; i++) {
    soundHistory.push({bass: 0, mid: 0, treble: 0, volume: 0});
  }

  // Window resize handler
  window.addEventListener('resize', () => {
    const visDiv = document.getElementById('visualization');
    resizeCanvas(visDiv.offsetWidth, visDiv.offsetHeight);
  });

  //start-button
  const startAudioBtn = document.getElementById('start-audio-btn');
//   startAudioBtn.addEventListener('click', startAudio);
  startAudioBtn.addEventListener('click', async () => {
    // if (!audioStarted) {
    //   await startAudio();
    // }
    await startAudio();
  });

  //recording-button
     //const recordBtn = document.getElementById('record-btn');
     //recordBtn.addEventListener('click', toggleRecording);

     const recordBtn = document.getElementById('record-btn');
     if (recordBtn) {
       recordBtn.addEventListener('click', () => {
         if (audioStarted) {
           console.log('Record button clicked');
           toggleRecording();
         } else {
           console.log('Please start audio first');
           alert('Please start audio first before recording');
         }
       });
     }
     
    
  lastCaptureTime = millis();

}

async function startAudio() {
    try {
      if (audioStarted){
        console.log('Starting audio...'); 
        
        if (mic) {
          mic.stop();
          mic = null;
      }
      
      // stop FFT
      if (fft) {
          fft = null;
      }

      audioStarted = false;
      const startAudioBtn = document.getElementById('start-audio-btn');
      startAudioBtn.style.background = '#dc2626'; // 红色背景
      startAudioBtn.textContent = 'Start Audio';
      
      console.log('Audio successfully stopped');
      return;
      }

      console.log('Starting audio...');
        
        await getAudioContext().resume();
        
        // mic
        mic = new p5.AudioIn();
        await mic.start();
      
        fft = new p5.FFT();
        fft.setInput(mic);

      // uodate UI和状态
      audioStarted = true;
      const startAudioBtn = document.getElementById('start-audio-btn');
      startAudioBtn.style.background = '#059669';  
      startAudioBtn.textContent = 'Audio Started';
      
      console.log('Audio successfully started');
    } catch (error) {
      console.error('Error starting audio:', error);
      alert('Error starting audio. Please try again.');

      audioStarted = false;
        mic = null;
        fft = null;
        const startAudioBtn = document.getElementById('start-audio-btn');
        startAudioBtn.style.background = '#dc2626';
        startAudioBtn.textContent = 'Start Audio';


    }

  }

// function startAudio() {
//     // userStartAudio();
//     // mic.start();
//     console.log('Starting audio...'); 
//     userStartAudio();
//     mic = new p5.AudioIn();
//     mic.start();
//     fft = new p5.FFT();
//     fft.setInput(mic);

//     const startAudioBtn = document.getElementById('start-audio-btn');
//     startAudioBtn.style.background = '#059669';  
//     // startAudioBtn.disabled = true; 
//     startAudioBtn.textContent = 'Audio Started';
//   }


  function toggleRecording() {
    isRecording = !isRecording;

    const btn = document.getElementById('record-btn');
    const status = document.getElementById('recording-status');
    
    if (isRecording) {
        btn.textContent = 'Stop Recording';
        btn.classList.add('recording');
        status.textContent = 'Recording...';
        calmStartTime = millis();
        calmDuration = 0;
        console.log('Recording started');
    } else {
        btn.textContent = 'Start Recording';
        btn.classList.remove('recording');
        status.textContent = 'Not Recording';
        console.log('Recording stopped');
        calmStartTime = 0;
        calmDuration = 0;
    }
}

function updateCalmTimer(volume) {
    const calmTimeDisplay = document.getElementById('calm-time');
    
    if (volume < VOLUME_THRESHOLD) {
        // 在Calm状态下update计时器
        if (calmStartTime === 0) {
            calmStartTime = millis();
        }
        calmDuration = millis() - calmStartTime;
        
        //check 2 min
        if (calmDuration >= MAX_CALM_DURATION && isRecording) {
            console.log('Auto-stopped recording due to prolonged calm state');
            toggleRecording();
            return;
        }
    } else {
        // 重置Calm计时器
        calmStartTime = 0;
        calmDuration = 0;
    }
    
    //show update
    let seconds = Math.floor(calmDuration / 1000);
    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;
    calmTimeDisplay.textContent = 
        `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}



function updateUI(emotion, volume, bass, mid, treble, confidence) {
  // Update emotion display
  document.getElementById('emotion-display').textContent = emotions[Math.floor(emotion)];
  document.getElementById('emotion-meter').style.width = `${confidence}%`;
  
  // Update volume display
  const volumePercent = map(volume, 0, 255, 0, 100);
  document.getElementById('volume-value').textContent = `${Math.round(volumePercent)}%`;
  
  // Update confidence display
  document.getElementById('confidence-value').textContent = `${Math.round(confidence)}%`;
  
  // Update audio meters
  document.getElementById('bass-meter').style.width = `${map(bass, 0, 255, 0, 100)}%`;
  document.getElementById('mid-meter').style.width = `${map(mid, 0, 255, 0, 100)}%`;
  document.getElementById('treble-meter').style.width = `${map(treble, 0, 255, 0, 100)}%`;
}


function drawSpectrum(spectrum) {
    // Clear canvas
    spectrumCtx.fillStyle = '#2d3748';
    spectrumCtx.fillRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
    
    // Draw spectrum
    const barWidth = spectrumCanvas.width / 64;
    const spectrumLength = Math.min(spectrum.length, 64);
    
    for(let i = 0; i < spectrumLength; i++) {
      const barHeight = map(spectrum[i], 0, 255, 0, spectrumCanvas.height);
      const x = i * barWidth;
      const y = spectrumCanvas.height - barHeight;
      
      // Gradient based on frequency
      const hue = map(i, 0, spectrumLength, 200, 300);
      spectrumCtx.fillStyle = `hsla(${hue}, 70%, 60%, 0.8)`;
      spectrumCtx.fillRect(x, y, barWidth - 1, barHeight);
    }
  }
  
function draw() {
    background(0, 20);
    // if (!mic) return;


  if (!audioStarted || !mic) {
    textAlign(CENTER, CENTER);
    textSize(20);
    fill(255);
    text('Click "Start Audio" to begin', width/2, height/2);
    return;
  }

    
    // Get  data
    let spectrum = fft.analyze();
    let bass = fft.getEnergy("bass");
    let mid = fft.getEnergy("mid");
    let treble = fft.getEnergy("treble");
    let volume = (bass + mid + treble) / 3;
    
    // Process data
    let filtered = filterNoise(volume, bass, mid, treble);
    smoothedBass = smoothSignal(filtered.bass, smoothedBass);
    smoothedMid = smoothSignal(filtered.mid, smoothedMid);
    smoothedTreble = smoothSignal(filtered.treble, smoothedTreble);
    
    updateSoundHistory(bass, mid, treble, volume);
    
    // Detect emotion
    let currentEmotion = improvedEmotionInference(bass, mid, treble, volume);
    emotionTransition = lerp(emotionTransition, currentEmotion, 0.1);
    
    let bassToTrebleRatio = bass / (treble + 1);
    let midToTotalRatio = mid / (bass + mid + treble + 1);
    let energyVariance = calculateVariance([bass, mid, treble]);
    let volumeTrend = calculateTrend('volume');
    let bassTrend = calculateTrend('bass');

    displayEmotionInfo(currentEmotion, volume);
    drawEnhancedVisualization(currentEmotion, volume, spectrum);
    drawVolumeMeter(volume);
    drawSpectrum(spectrum);
    prevEmotion = currentEmotion;

    updateCalmTimer(volume);

    //auto-record
    // if (!isRecording && volume > VOLUME_THRESHOLD) {
    //     toggleRecording();
    // }

    // if (!isRecording && volume > VOLUME_THRESHOLD) {
    //     console.log('Auto recording triggered by volume:', volume);
    //     toggleRecording();
    //   }

    // if (millis() - lastCaptureTime > CAPTURE_INTERVAL) {

    if  (isRecording && millis() - lastCaptureTime > CAPTURE_INTERVAL) {
    
    let data = {
      timestamp: Date.now(),
      bass: bass,
      mid: mid,
      treble: treble,
      volume: volume,
      bassToTrebleRatio: bassToTrebleRatio,
      midToTotalRatio: midToTotalRatio,
      energyVariance: energyVariance,
      volumeTrend: volumeTrend,
      bassTrend: bassTrend,
      spectrum: Array.from(spectrum),
      emotion: emotions[currentEmotion]
    };
    
    // screen shot & data
    if (isRecording) {
    saveCanvas('emotion_' + Date.now(), 'png');
    saveStrings([JSON.stringify(data)], 'data_' + Date.now() + '.json');

    console.log('Saved data:', data);
    }
    
    lastCaptureTime = millis();
  }


    // Calculate confidence
    let confidence = map(1 - Math.abs((emotionTransition % 1) - 0.5) * 2, 0, 1, 70, 100);
    
    // Update UI
    updateUI(emotionTransition, volume, bass, mid, treble, confidence);
    drawSpectrum(spectrum);
    
    // Draw visualization
    drawEnhancedVisualization(currentEmotion, volume, spectrum);
    prevEmotion = currentEmotion;
  }



  function updateSoundHistory(bass, mid, treble, volume) {
    soundHistory.push({bass, mid, treble, volume});
    if(soundHistory.length > HISTORY_LENGTH) {
      soundHistory.shift();
    }
  }
  
  function improvedEmotionInference(bass, mid, treble, volume) {
    // caculate feature of voice
    let bassToTrebleRatio = bass / (treble + 1);  
    let midToTotalRatio = mid / (bass + mid + treble + 1);
    let energyVariance = calculateVariance([bass, mid, treble]);
    
    // history trend
    let volumeTrend = calculateTrend('volume');
    let bassTrend = calculateTrend('bass');
    
    // print
    // console.log(`
    //   Volume: ${volume}
    //   Bass/Treble Ratio: ${bassToTrebleRatio}
    //   Mid/Total Ratio: ${midToTotalRatio}
    //   Energy Variance: ${energyVariance}
    //   Volume Trend: ${volumeTrend}
    //   Bass Trend: ${bassTrend}
    // `);

    updateDataDisplay({
        volume: volume,
        bassToTreble: bassToTrebleRatio,
        midTotal: midToTotalRatio,
        energy: energyVariance,
        volTrend: volumeTrend,
        bassTrend: bassTrend
    });

    console.log(`
        Volume: ${volume}
        Bass/Treble Ratio: ${bassToTrebleRatio}
        Mid/Total Ratio: ${midToTotalRatio}
        Energy Variance: ${energyVariance}
        Volume Trend: ${volumeTrend}
        Bass Trend: ${bassTrend}
    `);
    
    // logic
    // if (volume < 50 || (volumeTrend < 0 && volume < 80)) 
    // if (volume < 60 || (volumeTrend < -0.5 && volume < 70)) 
    if (volume < 60 || (volumeTrend < -0.3 && volume < 75)) 
    {
      return 0; // Calm
    }
    
     // if (treble > mid * 1.2 && volume > 100 && energyVariance > 1000) 
     // if (treble > mid * 1.2 && volume > 100 && volumeTrend > 0) return "Happy"
    // if (treble > mid && volume > 60 && energyVariance > 500)
    // if (bassToTrebleRatio < 5 && volume > 75 && energyVariance > 1700)
    // if (
    //     // (treble > mid && 
    //     // volume > 60 && volume < 150 && 
    //     // energyVariance > 1600 && 
    //     // volumeTrend > 0.2) ||
    //    (bassToTrebleRatio < 5 && volume > 75 && energyVariance > 1600))
      
    // {
        if ((treble > mid * 0.8 && 
            volume > 70 && volume < 160 && 
            energyVariance > 1400 &&
            volumeTrend > 0) ||                    // 1
           (bassToTrebleRatio < 4 && 
            volume > 65 && 
            energyVariance > 1300) ||              // 2
           (volume > 80 && volume < 150 &&
            energyVariance > 1500 &&
            volumeTrend > 0.2))                   //3
      {
            return 1; // Happy
      }
    
    // if (midToTotalRatio > 0.4 && volume < 150 && Math.abs(volumeTrend) < 5)
    // if (midToTotalRatio > 0.4 && volume < 150 && volumeTrend < 0) return "Sad"
    // if (midToTotalRatio > 0.2 && volume > 60 && volume < 120 && volumeTrend < 0)
    // if (midToTotalRatio > 0.4 && volumeTrend < -0.3 && volume < 100) 
    if ((midToTotalRatio > 0.3 && 
         volume > 65 && volume < 110 && 
         volumeTrend < -0.35) || 
        (midToTotalRatio > 0.4 && 
         energyVariance < 1400 && 
         volume < 85))
    {
      return 2; // Sad
    }
    
    // if (bassToTrebleRatio > 0.5 && volume > 150 && bassTrend > 0) 
    // if (bassToTrebleRatio > 15 && volume > 100 && bassTrend > 0.5) 
    if ((bassToTrebleRatio > 3 && 
         volume > 90 && 
         bassTrend > 0.3) || 
        (bass > treble * 1.8 && 
         volume > 110 && 
         energyVariance > 1700))
    {
      return 3; // Angry
    }
    
    return prevEmotion; // keep
  }

  function updateDataDisplay(data) {
    // 更新各个数据显示
    document.getElementById('volume-value').textContent = data.volume.toFixed(1);
    document.getElementById('bass-treble-ratio').textContent = data.bassToTreble.toFixed(2);
    document.getElementById('mid-total-ratio').textContent = (data.midTotal * 100).toFixed(1) + '%';
    document.getElementById('energy-variance').textContent = Math.round(data.energy);
    document.getElementById('volume-trend').textContent = data.volTrend.toFixed(2);
    document.getElementById('bass-trend').textContent = data.bassTrend.toFixed(2);

    // 
    const values = document.querySelectorAll('.data-value');
    values.forEach(value => {
        const num = parseFloat(value.textContent);
        if (num > 0) {
            value.style.color = '#10B981'; // + green
        } else if (num < 0) {
            value.style.color = '#EF4444'; // - red
        } else {
            value.style.color = '#60A5FA'; // 0 blue
        }
    });
}
  
  function calculateVariance(array) {
    const mean = array.reduce((a, b) => a + b) / array.length;
    return array.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / array.length;
  }
  
  function calculateTrend(parameter) {
    let values = soundHistory.map(h => h[parameter]);
    let sum = 0;
    for(let i = 1; i < values.length; i++) {
      sum += values[i] - values[i-1];
    }
    return sum / (values.length - 1);
  }
  
  function drawEnhancedVisualization(emotion, volume, spectrum) {
    push();
    translate(width/2, height/2);
    
    let params = emotionParameters[Math.floor(emotion)];
    let nextParams = emotionParameters[Math.ceil(emotion) % emotionParameters.length];
    
    let currentParams = {
      pulseSpeed: lerp(params.pulseSpeed, nextParams.pulseSpeed, emotion % 1),
      complexity: lerp(params.complexity, nextParams.complexity, emotion % 1),
      amplitude: lerp(params.amplitude, nextParams.amplitude, emotion % 1)
    };

    //bg color change
    let bgColor1 = backgroundColors[Math.floor(emotion)];
    let bgColor2 = backgroundColors[Math.ceil(emotion) % backgroundColors.length];
    let currentBg = [
      lerp(bgColor1[0], bgColor2[0], emotion % 1),
      lerp(bgColor1[1], bgColor2[1], emotion % 1),
      lerp(bgColor1[2], bgColor2[2], emotion % 1)
    ];
    
    //bg gradientRadius
    let gradientRadius = width > height ? width/1.5 : height/1.5;
    for(let r = gradientRadius; r > 0; r -= 2) {
      let inter = map(r, 0, gradientRadius, 0, 1);
      let c = color(currentBg[0], currentBg[1], currentBg[2], 2);
      fill(c);
      noStroke();
      ellipse(0, 0, r*2, r*2);
    }

    
    let baseRadius = map(volume, 0, 255, 50, 200);
    let time = frameCount * currentParams.pulseSpeed * 0.02;
    
    let color1 = emotionColors[Math.floor(emotion)];
    let color2 = emotionColors[Math.ceil(emotion) % emotionColors.length];
    
    noFill();
    strokeWeight(2);
    
    //line 
    for (let i = 0; i < 360; i += 5) {
      let angle = radians(i);
      let noiseVal = noise(cos(angle) + 1, sin(angle) + 1, time);
      let r = baseRadius + spectrum[i] * 0.5 + 
              sin(angle * currentParams.complexity + time) * currentParams.amplitude +
              noiseVal * 20;
              
      let x = r * cos(angle);
      let y = r * sin(angle);
      
      let lerpAmount = map(sin(angle + time * 2), -1, 1, 0, 1);
      let currentColor = [
        lerp(color1[0], color2[0], lerpAmount),
        lerp(color1[1], color2[1], lerpAmount),
        lerp(color1[2], color2[2], lerpAmount)
      ];
      
      stroke(currentColor[0], currentColor[1], currentColor[2], 2);
      line(0, 0, x, y);
      
      fill(currentColor[0], currentColor[1], currentColor[2], 0);
      ellipse(x, y, 10 + noiseVal * 5, 10 + noiseVal * 5);
    }
    
    // pop();

    // 2. 添加发光效果
  drawingContext.shadowBlur = 20;
  drawingContext.shadowColor = color(color1[0], color1[1], color1[2], 150);
  
  // 3. 粒子系统
  let particleCount = 50;
  for(let i = 0; i < particleCount; i++) {
    let angle = TWO_PI * i / particleCount;
    let noiseVal = noise(cos(angle) + 1, sin(angle) + 1, time * 0.5);
    let r = baseRadius * (1 + noiseVal * 0.3);
    let x = r * cos(angle);
    let y = r * sin(angle);
    
    let particleSize = map(sin(time * 2 + i), -1, 1, 2, 8);
    fill(color1[0], color1[1], color1[2], 150 * noiseVal);
    noStroke();
    ellipse(x, y, particleSize, particleSize);
  }
  
  // 4. 动态波形线
  noFill();
  for(let j = 0; j < 3; j++) { // 多层波形
    beginShape();
    for(let i = 0; i < 360; i += 2) {
      let angle = radians(i);
      let noiseVal = noise(cos(angle) + 1, sin(angle) + 1, time + j * 0.5);
      let r = baseRadius + spectrum[i] * 0.5 + 
              sin(angle * currentParams.complexity + time) * currentParams.amplitude * (1 + j * 0.2) +
              noiseVal * 20;
              
      let x = r * cos(angle);
      let y = r * sin(angle);
      
      let lerpAmount = map(sin(angle + time * 2), -1, 1, 0, 1);
      let currentColor = [
        lerp(color1[0], color2[0], lerpAmount),
        lerp(color1[1], color2[1], lerpAmount),
        lerp(color1[2], color2[2], lerpAmount)
      ];
      
      stroke(currentColor[0], currentColor[1], currentColor[2], 150 / (j + 1));
      strokeWeight(2 - j * 0.5);
      vertex(x, y);
    }
    endShape(CLOSE);
  }
  
  // 5. 频谱响应圆环
  noFill();
  strokeWeight(2);
  for(let i = 0; i < 360; i += 15) {
    let angle = radians(i);
    let spectrumValue = spectrum[i % spectrum.length];
    let r = baseRadius + map(spectrumValue, 0, 255, 0, 100);
    
    let x = r * cos(angle);
    let y = r * sin(angle);
    
    // 动态颜色混合
    let mixAmount = map(sin(time * 3 + i), -1, 1, 0, 1);
    let ringColor = [
      lerp(color1[0], color2[0], mixAmount),
      lerp(color1[1], color2[1], mixAmount),
      lerp(color1[2], color2[2], mixAmount)
    ];
    
    stroke(ringColor[0], ringColor[1], ringColor[2], 180);
    let ringSize = map(spectrumValue, 0, 255, 5, 15);
    ellipse(x, y, ringSize, ringSize);
  }
  
  // 6. 中心光晕
  let centerGlow = 100 + sin(time * 4) * 50;
  drawingContext.shadowBlur = centerGlow;
  fill(color1[0], color1[1], color1[2], 50);
  noStroke();
  ellipse(0, 0, baseRadius * 0.5, baseRadius * 0.5);
  
  pop();
  drawingContext.shadowBlur = 0;

  }
  
  
  
  function displayEmotionInfo(emotion, volume) {
    textAlign(CENTER, TOP);
    textSize(22);
    noStroke();
    
    let emotionIndex = Math.floor(emotion);
    let confidence = map(Math.abs((emotion % 1) - 0.5), 0, 0.5, 0, 100);
    
    let currentEmotion = emotions[emotionIndex];
    let nextEmotion = emotions[(emotionIndex + 1) % emotions.length];
    
    // main emotion
    fill(255);
    text(`Current Emotion: ${emotions[emotionIndex]}`, width/2, 20);
    //text(`Confidence: ${confidence.toFixed(1)}%`, width/2, 50);
    text(`Volume: ${volume.toFixed(1)}`, width/2, 100);
    
    
      textSize(16);
    if (confidence < 60) {
      text(`Transitioning between ${currentEmotion} and ${nextEmotion}`, width/2, 50);
      text(`Confidence: ${confidence.toFixed(1)}%`, width/2, 75);
    } else {
      textSize(14);
      text(`Confidence: ${confidence.toFixed(1)}%`, width/2, 75);
    }
  }
  
  function drawVolumeMeter(volume) {
    let meterWidth = 20;
    let meterHeight = height - 40;
    let x = width - meterWidth - 20;
    let y = 20;
    
    // bg
    fill(30,30,35,10);
    rect(x, y, meterWidth, meterHeight, 20);
    strokeWeight(1);
    rect(x, y, meterWidth, meterHeight, 20);
    
    //音量条
    let volumeHeight = map(volume, 0, 255, 0, meterHeight);
    let volumeColor = color(255, 255, 255);
    volumeColor.setAlpha(100);
    fill(volumeColor);
   rect(x, y + meterHeight - volumeHeight, meterWidth, volumeHeight, 20);
  
    
    
    //line map
    stroke(255,100,100,10);
    for(let i = 0; i <= 10; i++) {
      let ly = y + i * (meterHeight/10);
      line(x, ly, x + meterWidth, ly);
    }
    
    //volume tag
    push();
    translate(x + meterWidth/2 - 10, height - 45);
    rotate(-HALF_PI);
    fill(255,255,255,100);
    textAlign(CENTER, BOTTOM);
    textSize(14);
    text("Volume", 0, 0);
    pop();
  }
  
  
  
  
  function drawSpectrum(spectrum) {
    let x = 20;
    let y = height - 100;
    let w = 200;
    let h = 80;
    
    // Background
    fill(100,100,100, 10);
    rect(x, y, w, h);
    
    // Draw bass spectrum (blue)
    drawSpectrumBand(spectrum, x, y, w, h, [0, 0, 240], 0);
    //mid spectrum (green)
    drawSpectrumBand(spectrum, x, y, w, h, [0, 240, 0], 1);
    //treble spectrum (red)
    drawSpectrumBand(spectrum, x, y, w, h, [240, 0, 0], 2);
    
    // Labels
    fill(255,200);
    textAlign(CENTER);
    textSize(14);
    text("Frequency Spectrum", x + w/2, y + h + 20);
  }
  
  function drawSpectrumBand(spectrum, x, y, w, h, color, offset) {
    stroke(color[0], color[1], color[2], 200);
    noFill();
    
    beginShape();
    for(let i = 0; i < w; i++) {
      let index = floor(map(i, 0, w, 0, spectrum.length));
      let value = map(spectrum[index], 0, 255, 0, h/4);
      let yOffset = y + (h/4) * (offset + 1);
      vertex(x + i, yOffset - value);
    }
    endShape();
  }


//光晕
function drawGlow(x, y, radius, color, intensity) {
  drawingContext.shadowBlur = intensity;
  drawingContext.shadowColor = color;
  noStroke();
  fill(color);
  ellipse(x, y, radius * 2);
  drawingContext.shadowBlur = 0;
}
  