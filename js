/* =========================================================
   ABHA BEAUTY — main script
   1. Smooth nav scrolling
   2. Photo upload + canvas-based skin sampling
   3. Manual depth/undertone picker
   4. Recommendation engine (makeup + clothing)
   5. Review form
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------- 1. NAV ---------------- */
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.getElementById('heroCta').addEventListener('click', () => {
    document.getElementById('analyze').scrollIntoView({ behavior: 'smooth' });
  });

  /* ---------------- 2. PHOTO UPLOAD + ANALYSIS ---------------- */
  const photoInput   = document.getElementById('photoInput');
  const previewImg   = document.getElementById('previewImg');
  const analyzeBtn   = document.getElementById('analyzeBtn');
  const canvas       = document.getElementById('photoCanvas');
  const ctx          = canvas.getContext('2d', { willReadFrequently: true });
  const mirrorImg    = document.getElementById('mirrorImg');

  let uploadedImage = null;

  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        uploadedImage = img;
        previewImg.src = evt.target.result;
        previewImg.hidden = false;
        mirrorImg.src = evt.target.result;
        analyzeBtn.disabled = false;
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  analyzeBtn.addEventListener('click', () => {
    if (!uploadedImage) return;
    const { r, g, b } = sampleSkinColor(uploadedImage);
    const depth = classifyDepth(r, g, b);
    const undertone = classifyUndertone(r, g, b);
    showResult(depth, undertone, `rgb(${r}, ${g}, ${b})`);
  });

  function sampleSkinColor(img){
    // Draw the image at a manageable size
    const W = 240;
    const H = Math.round((img.height / img.width) * W) || 240;
    canvas.width = W;
    canvas.height = H;
    ctx.drawImage(img, 0, 0, W, H);

    // Sample a handful of face-ish regions: upper-center (forehead),
    // center-left and center-right (cheeks), lower-center (chin)
    const points = [
      [W * 0.5, H * 0.32],
      [W * 0.36, H * 0.5],
      [W * 0.64, H * 0.5],
      [W * 0.5, H * 0.62],
    ];

    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    points.forEach(([px, py]) => {
      const size = 14;
      const data = ctx.getImageData(
        Math.max(0, px - size / 2),
        Math.max(0, py - size / 2),
        size, size
      ).data;
      for (let i = 0; i < data.length; i += 4) {
        rSum += data[i];
        gSum += data[i + 1];
        bSum += data[i + 2];
        count++;
      }
    });

    return {
      r: Math.round(rSum / count),
      g: Math.round(gSum / count),
      b: Math.round(bSum / count),
    };
  }

  function classifyDepth(r, g, b){
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luminance > 195) return 'fair';
    if (luminance > 150) return 'light-medium';
    if (luminance > 100) return 'medium-tan';
    return 'deep';
  }

  function classifyUndertone(r, g, b){
    // Warm skin reads redder/yellower relative to blue.
    // Cool skin reads relatively higher in blue/pink.
    const warmth = (r - b) / (r + g + b);
    if (warmth > 0.055) return 'warm';
    if (warmth < 0.02) return 'cool';
    return 'neutral';
  }

  /* ---------------- 3. MANUAL PICKER ---------------- */
  let manualDepth = null;
  let manualUndertone = null;

  document.querySelectorAll('#depthChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#depthChips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      manualDepth = chip.dataset.depth;
    });
  });

  document.querySelectorAll('#undertoneChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#undertoneChips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      manualUndertone = chip.dataset.undertone;
    });
  });

  document.getElementById('manualBtn').addEventListener('click', () => {
    if (!manualDepth || !manualUndertone) {
      alert('Pick one option from each row — depth and undertone — to see your palette.');
      return;
    }
    showResult(manualDepth, manualUndertone, null);
  });

  /* ---------------- 4. RECOMMENDATION ENGINE ---------------- */
  const DEPTH_LABELS = {
    'fair': 'Fair',
    'light-medium': 'Light–Medium',
    'medium-tan': 'Medium–Tan',
    'deep': 'Deep',
  };
  const UNDERTONE_LABELS = { warm: 'Warm', cool: 'Cool', neutral: 'Neutral' };

  const FOUNDATION_NOTES = {
    fair: 'Look for shades labelled "porcelain" or "ivory" and check they don\'t oxidize orange after an hour of wear.',
    'light-medium': 'Shades labelled "beige" or "sand" usually match — test along the jaw, not the hand.',
    'medium-tan': 'Shades labelled "honey," "caramel" or "tan" work well; a warm-leaning formula prevents an ashy finish.',
    deep: 'Look for shades labelled "deep," "espresso," or "cocoa" with enough pigment to avoid grey-back oxidation.',
  };

  const MAKEUP_BY_UNDERTONE = {
    warm: [
      'Foundation with a golden or yellow base, not pink',
      'Blush in peach, coral or terracotta',
      'Lipstick in brick red, warm nude or coral',
      'Eyeshadow in bronze, copper, olive and gold',
      'Gold-toned highlighter over silver',
    ],
    cool: [
      'Foundation with a pink or neutral-pink base',
      'Blush in rose, berry or soft mauve',
      'Lipstick in blue-red, cool pink or plum',
      'Eyeshadow in taupe, silver, lavender and slate',
      'Silver-toned highlighter over gold',
    ],
    neutral: [
      'Foundation with a true neutral base (neither pink nor gold)',
      'Blush in soft rose-peach or dusty pink',
      'Lipstick in mauve-nude, rosewood or muted red',
      'Eyeshadow in soft browns, mauves and champagne',
      'Either gold or silver highlighter works — pick by mood',
    ],
  };

  const CLOTHING_BY_UNDERTONE = {
    warm: {
      wear: [
        ['Terracotta', '#C8735A'], ['Olive', '#7C7A44'], ['Mustard', '#D8A93B'],
        ['Warm coral', '#E8836A'], ['Camel', '#C9A15C'], ['Rust brown', '#8A4B32'],
      ],
      avoid: [
        ['Icy blue', '#B9D3E0'], ['Cool fuchsia', '#C43D82'], ['Stark white', '#F5F5F5'],
      ],
    },
    cool: {
      wear: [
        ['Berry', '#8A2E4E'], ['Sapphire blue', '#2C4E8A'], ['Emerald', '#1F6E5C'],
        ['Icy lavender', '#C9B7DE'], ['True white', '#FBFBFB'], ['Charcoal grey', '#3F3F42'],
      ],
      avoid: [
        ['Mustard yellow', '#D8A93B'], ['Orange', '#E06B2E'], ['Warm beige', '#D9BFA0'],
      ],
    },
    neutral: {
      wear: [
        ['Dusty rose', '#D0949B'], ['Sage green', '#8AA6A3'], ['Soft camel', '#C9A97A'],
        ['Denim blue', '#4E6C8A'], ['Warm grey', '#8C8580'], ['Muted teal', '#4F8482'],
      ],
      avoid: [
        ['Neon shades', '#D6FF3F'], ['Very stark black/white contrast', '#111111'],
      ],
    },
  };

  function showResult(depth, undertone, sampledColor){
    const paletteSection = document.getElementById('palette');
    paletteSection.hidden = false;

    document.getElementById('resultDepth').textContent = DEPTH_LABELS[depth];
    document.getElementById('resultUndertone').textContent = UNDERTONE_LABELS[undertone];

    const dot = document.getElementById('sampledDot');
    if (sampledColor) {
      dot.style.background = sampledColor;
      dot.style.display = 'inline-block';
    } else {
      dot.style.display = 'none';
    }

    // light up the matching wells in the signature palette strip
    document.querySelectorAll('.well').forEach(w => w.classList.remove('lit'));
    const depthWell = document.querySelector(`.well[data-well="${depth}"]`);
    const undertoneWell = document.querySelector(`.well[data-well="${undertone}"]`);
    if (depthWell) depthWell.classList.add('lit');
    if (undertoneWell) undertoneWell.classList.add('lit');

    // makeup list
    const makeupList = document.getElementById('makeupList');
    makeupList.innerHTML = '';
    MAKEUP_BY_UNDERTONE[undertone].forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      makeupList.appendChild(li);
    });

    document.getElementById('foundationNote').textContent = FOUNDATION_NOTES[depth];

    // clothing swatches
    renderSwatches('clothingSwatches', CLOTHING_BY_UNDERTONE[undertone].wear);
    renderSwatches('avoidSwatches', CLOTHING_BY_UNDERTONE[undertone].avoid);

    paletteSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderSwatches(containerId, colors){
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    colors.forEach(([name, hex]) => {
      const wrap = document.createElement('div');
      wrap.className = 'swatch';
      const chip = document.createElement('div');
      chip.className = 'swatch-chip';
      chip.style.background = hex;
      const label = document.createElement('span');
      label.textContent = name;
      wrap.appendChild(chip);
      wrap.appendChild(label);
      container.appendChild(wrap);
    });
  }

  /* ---------------- 5. REVIEWS ---------------- */
  let selectedStars = 0;
  const starRow = document.getElementById('starRow');
  const reviewsList = document.getElementById('reviewsList');

  starRow.addEventListener('click', (e) => {
    const star = e.target.closest('.star');
    if (!star) return;
    selectedStars = Number(star.dataset.star);
    document.querySelectorAll('.star').forEach(s => {
      s.classList.toggle('active', Number(s.dataset.star) <= selectedStars);
    });
  });

  let reviews = [
    { name: 'Ritika M.', stars: 5, text: 'Told me I was cool-toned and the berry lipstick suggestion was spot on — finally stopped buying orange lipsticks!' },
    { name: 'Aanya K.', stars: 4, text: 'The clothing colour palette matched what my stylist told me years ago. Loved the sage and denim blue picks.' },
    { name: 'Meher S.', stars: 5, text: 'Uploaded a selfie and the undertone read matched my jewelry test perfectly. Super fun tool!' },
  ];

  function renderReviews(){
    reviewsList.innerHTML = '';
    reviews.slice().reverse().forEach(r => {
      const card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML = `
        <p class="review-name">${escapeHtml(r.name)}</p>
        <p class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</p>
        <p class="review-text">${escapeHtml(r.text)}</p>
      `;
      reviewsList.appendChild(card);
    });
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById('reviewForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reviewName').value.trim();
    const text = document.getElementById('reviewText').value.trim();

    if (!name || !text) return;
    if (selectedStars === 0) {
      alert('Please select a star rating before posting your review.');
      return;
    }

    reviews.push({ name, stars: selectedStars, text });
    renderReviews();

    e.target.reset();
    selectedStars = 0;
    document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
  });

  renderReviews();
});
