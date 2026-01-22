
    const MUSIC = {
      inicio: "inicio01.mp3",
      investigacao: "investigacao01.mp3",
      revelacao: "revelacao01.mp3",
    };

    const body = document.body;
    const lens = document.getElementById("lens");
    const lensImg = lens.querySelector("img");

    const p2 = document.getElementById("p2");
    const p2Stage = document.getElementById("p2Stage");
    const p2Reveal = document.getElementById("p2Reveal");
    const btnPegarLupa = document.getElementById("btnPegarLupa");

    const p4 = document.getElementById("p4");
    const p4Image = document.getElementById("p4Image");
    const credits = document.getElementById("credits");

    const card1 = document.getElementById("card1");
    const card2 = document.getElementById("card2");
    const card3 = document.getElementById("card3");
    const card4 = document.getElementById("card4");

    const soundToggle = document.getElementById("soundToggle");

    let lensEnabled = false;
    let choice = null; 

    let musicMode = "inicio"; 
    let soundOn = false;

   
    function setCreditsVisible(visible){
      credits.classList.toggle("show", !!visible);
    }

    function setPage4Variant(v){
      const map = {
        v1: "Layout/Layouts_pag04v1.png",
        v2: "Layout/Layouts_pag04v2.png",
        v3: "Layout/Layouts_pag04v3.png",
      };
      p4Image.src = map[v] || map.v1;
      setCreditsVisible(v === "v3");
    }

    (function preloadLens(){
      if (!lensImg) return;
      lensImg.loading = "eager";
      lensImg.decoding = "async";
      const preload = new Image();
      preload.src = lensImg.src;
      if (preload.decode) preload.decode().catch(()=>{});
    })();


    const audioInicio = new Audio(MUSIC.inicio);
    const audioInvestigacao = new Audio(MUSIC.investigacao);
    const audioRevelacao = new Audio(MUSIC.revelacao);


    [audioInicio, audioInvestigacao, audioRevelacao].forEach(a => {
      a.preload = "auto";
      a.loop = true;          
      a.volume = 0;           
    });

    let currentAudio = null;

    function stopAllAudio(){
      [audioInicio, audioInvestigacao, audioRevelacao].forEach(a => {
        try{ a.pause(); }catch(e){}
        a.currentTime = 0;
        a.volume = 0;
      });
      currentAudio = null;
    }

    function getAudioByMode(mode){
      if (mode === "inicio") return audioInicio;
      if (mode === "investigacao") return audioInvestigacao;
      return audioRevelacao;
    }

    async function safePlay(aud){
      // tenta tocar (vai funcionar depois do clique no botão)
      try{
        await aud.play();
        return true;
      } catch (e) {
        return false;
      }
    }

    async function crossfadeTo(target, fadeMs = 900){
      if (!soundOn) return;

      const from = currentAudio;
      const to = target;

      if (from === to && from && !from.paused) return;

      // garante volume inicial
      if (to.volume !== 0) to.volume = 0;

      // tenta iniciar o target
      await safePlay(to);

      const steps = 18;
      const stepTime = Math.max(20, Math.floor(fadeMs / steps));
      let i = 0;

      const fade = setInterval(() => {
        i++;
        const t = i / steps;

        // fade-in do novo
        to.volume = Math.min(1, t);

        // fade-out do antigo
        if (from) from.volume = Math.max(0, 1 - t);

        if (i >= steps) {
          clearInterval(fade);
          // finaliza
          to.volume = 1;
          if (from) {
            from.volume = 0;
            from.pause();
            from.currentTime = 0;
          }
          currentAudio = to;
        }
      }, stepTime);
    }

    // aplica modo atual (inicio/investigacao/revelacao) no áudio
    async function applyMusicMode(){
      if (!soundOn) return;
      const target = getAudioByMode(musicMode);
      await crossfadeTo(target);
      updateSoundButton();
    }

    function updateSoundButton(){
      soundToggle.textContent = soundOn ? "🔊 Som: ON" : "🔇 Som: OFF";
    }

    soundToggle.addEventListener("click", async () => {
      soundOn = !soundOn;

      if (!soundOn) {
        stopAllAudio();
        updateSoundButton();
        return;
      }

      // ao ligar, toca conforme o modo atual
      const target = getAudioByMode(musicMode);
      // inicia direto no target com fade-in curto
      currentAudio = null;
      await crossfadeTo(target, 500);
      updateSoundButton();
    });

    function showLens(show){ lens.classList.toggle("show", show); }

    let lastMouse = { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 };
    let pending = null;
    let rafId = null;

    function readLensConfig(){
      const rootStyle = getComputedStyle(document.documentElement);

      const lensSize = parseFloat(rootStyle.getPropertyValue("--lens-size")) || 420;

      const axPct = parseFloat(rootStyle.getPropertyValue("--lens-anchor-x")) || 82;
      const ayPct = parseFloat(rootStyle.getPropertyValue("--lens-anchor-y")) || 86;
      const ax = lensSize * (axPct / 100);
      const ay = lensSize * (ayPct / 100);

      const revealR = parseFloat(rootStyle.getPropertyValue("--lens-reveal-radius")) || 170;

      const gxPct = parseFloat(rootStyle.getPropertyValue("--lens-glass-x")) || 50;
      const gyPct = parseFloat(rootStyle.getPropertyValue("--lens-glass-y")) || 50;
      const gx = lensSize * (gxPct / 100);
      const gy = lensSize * (gyPct / 100);

      return { lensSize, ax, ay, revealR, gx, gy };
    }

    function updateReveal(){
      if (!pending || !lensEnabled) return;

      const { clientX, clientY } = pending;
      const { ax, ay, revealR, gx, gy } = readLensConfig();

      const rect = p2Stage.getBoundingClientRect();
      const inside =
        clientX >= rect.left && clientX <= rect.right &&
        clientY >= rect.top  && clientY <= rect.bottom;

      if (!inside) {
        p2Reveal.style.clipPath = "circle(0px at 50% 50%)";
        return;
      }

      const glassX = clientX + (gx - ax);
      const glassY = clientY + (gy - ay);

      const x = glassX - rect.left;
      const y = glassY - rect.top;

      p2Reveal.style.clipPath = `circle(${revealR}px at ${x}px ${y}px)`;
    }

    function scheduleUpdate(){
      if (!lensEnabled) return;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        pending = { clientX: lastMouse.clientX, clientY: lastMouse.clientY };
        updateReveal();
      });
    }

    function updateRevealNow(){
      if (!lensEnabled) return;
      pending = { clientX: lastMouse.clientX, clientY: lastMouse.clientY };
      updateReveal();
    }

    function enableLens(){
      lensEnabled = true;
      body.classList.add("lens-active");
      showLens(true);

      // ao pegar a lupa -> muda a música para investigação
      musicMode = "investigacao";
      applyMusicMode();

      // posiciona a lupa imediatamente e reage sem mexer o mouse
      const { ax, ay } = readLensConfig();
      lens.style.transform = `translate(${lastMouse.clientX - ax}px, ${lastMouse.clientY - ay}px)`;

      updateRevealNow();
      scheduleUpdate();
    }

    function disableLens(){
      lensEnabled = false;
      body.classList.remove("lens-active");
      showLens(false);
      p2Reveal.style.clipPath = "circle(0px at 50% 50%)";
    }

    btnPegarLupa.addEventListener("click", enableLens);

    window.addEventListener("mousemove", (e) => {
      if (!lensEnabled) return;

      const { ax, ay } = readLensConfig();
      lens.style.transform = `translate(${e.clientX - ax}px, ${e.clientY - ay}px)`;

      lastMouse.clientX = e.clientX;
      lastMouse.clientY = e.clientY;

      scheduleUpdate();
    }, { passive: true });

    window.addEventListener("scroll", () => { updateRevealNow(); scheduleUpdate(); }, { passive: true });
    window.addEventListener("resize", () => { updateRevealNow(); scheduleUpdate(); }, { passive: true });
    window.addEventListener("wheel",  () => { updateRevealNow(); scheduleUpdate(); }, { passive: true });

    const io = new IntersectionObserver((entries) => {
      for (const ent of entries) {
        if (ent.target.id === "p2" && !ent.isIntersecting) {
          disableLens();
        }

        if (ent.target.id === "p4" && ent.isIntersecting) {
          if (choice === null) setPage4Variant("v1");
          else if (choice === "wrong") setPage4Variant("v2");
          else setPage4Variant("v3");
        }
      }
    }, { threshold: 0.15 });

    io.observe(p2);
    io.observe(p4);

    function goToPage4With(v){
      choice = v;

      if (choice === "wrong") {
        setPage4Variant("v2");
        // mantém a música de investigação (não troca)
        if (musicMode !== "investigacao") {
          musicMode = "investigacao";
          applyMusicMode();
        }
      }

      if (choice === "correct") {
        setPage4Variant("v3");
        // ao acertar o assassino -> música de revelação
        musicMode = "revelacao";
        applyMusicMode();
      }

      p4.scrollIntoView({ behavior: "smooth" });
    }

    [card1, card2, card3].forEach(btn => btn.addEventListener("click", () => goToPage4With("wrong")));
    card4.addEventListener("click", () => goToPage4With("correct"));

    let debugOn = false;
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "h") {
        debugOn = !debugOn;
        document.documentElement.style.setProperty("--debug-outline", debugOn ? "1" : "0");
      }
    });


    updateSoundButton();
  
