// Ovozli aloqa (mikrofon): ikki o'yinchi o'rtasida to'g'ridan-to'g'ri WebRTC.
// Ulanish ma'lumotlari (SDP/ICE) `send` orqali yuboriladi: o'yinda — xona hodisalari, hubda — shaxsiy signal kanali.
const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }];

export class Voice {
  constructor(send, initiator, onChange) {
    this.sendFn = send; this.onChange = onChange || (() => { });
    this.on = false; this.track = null; this.tx = null; this.pending = []; this.speaking = false;
    this.audio = new Audio(); this.audio.autoplay = true;
    if (!window.RTCPeerConnection) { this.dead = true; return; }
    const pc = this.pc = new RTCPeerConnection({ iceServers: ICE });
    pc.onicecandidate = e => { if (e.candidate) this.send({ ice: e.candidate.toJSON() }); };
    pc.ontrack = e => { const s = e.streams[0] || new MediaStream([e.track]); this.audio.srcObject = s; this.audio.play().catch(() => { }); this.meter(s); };
    pc.onconnectionstatechange = () => this.onChange();
    // kichik uid boshlaydi — ikkalasi bir vaqtda taklif yubormasligi uchun
    if (initiator) this.start();
    else this.send({ hello: 1 }); // kechikib kirgan bo'lsa — taklifni qayta so'rash
  }
  get state() { return this.pc ? this.pc.connectionState : 'failed'; }
  send(o) { this.sendFn(o); }
  async start() {
    this.tx = this.pc.addTransceiver('audio', { direction: 'sendrecv' });
    await this.pc.setLocalDescription(await this.pc.createOffer());
    this.offer = { type: this.pc.localDescription.type, sdp: this.pc.localDescription.sdp };
    this.send({ sdp: this.offer });
  }
  async onSignal(ev) {
    if (this.dead) return;
    try {
      if (ev.hello) { if (this.offer && this.pc.signalingState === 'have-local-offer') this.send({ sdp: this.offer }); return; }
      if (ev.sdp) {
        if (ev.sdp.type === 'offer' && (this.lastOffer === ev.sdp.sdp || this.pc.signalingState !== 'stable')) return; // takroriy taklif
        if (ev.sdp.type === 'answer' && this.pc.signalingState !== 'have-local-offer') return;
        if (ev.sdp.type === 'offer') this.lastOffer = ev.sdp.sdp;
        await this.pc.setRemoteDescription(ev.sdp);
        if (ev.sdp.type === 'offer') {
          this.tx = this.pc.getTransceivers()[0]; this.tx.direction = 'sendrecv';
          if (this.track) await this.tx.sender.replaceTrack(this.track).catch(() => { });
          await this.pc.setLocalDescription(await this.pc.createAnswer());
          this.send({ sdp: { type: this.pc.localDescription.type, sdp: this.pc.localDescription.sdp } });
        }
        for (const c of this.pending.splice(0)) await this.pc.addIceCandidate(c).catch(() => { });
      } else if (ev.ice) {
        if (this.pc.remoteDescription) await this.pc.addIceCandidate(ev.ice).catch(() => { });
        else this.pending.push(ev.ice);
      }
    } catch (e) { console.warn('ovoz', e); }
  }
  // mikrofonni yoqish/o'chirish. Birinchi marta brauzer ruxsat so'raydi.
  async toggleMic() {
    if (this.dead) throw new Error("Bu brauzerda ovozli aloqa ishlamaydi");
    if (!this.track) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Mikrofon topilmadi');
      const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      this.track = st.getAudioTracks()[0];
      if (this.tx) await this.tx.sender.replaceTrack(this.track);
      this.on = true;
    } else { this.on = !this.on; this.track.enabled = this.on; }
    this.onChange();
    return this.on;
  }
  // hub: bitta umumiy mikrofon hamma ulanishlarga beriladi
  setTrack(track) { this.track = track; if (this.tx && track) this.tx.sender.replaceTrack(track).catch(() => { }); }
  setVolume(v) { this.audio.volume = Math.max(0, Math.min(1, v)); }
  // raqib gapirayotganini aniqlash (ekranda 🔊 belgisi uchun)
  meter(stream) {
    try {
      const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      this.timer = setInterval(() => {
        an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128));
        const sp = m > 14; if (sp !== this.speaking) { this.speaking = sp; this.onChange(); }
      }, 120);
    } catch (e) { }
  }
  close(keepTrack) {
    clearInterval(this.timer);
    try { if (this.track && !keepTrack) this.track.stop(); } catch (e) { }
    try { if (this.pc) this.pc.close(); } catch (e) { }
    try { if (this.ctx) this.ctx.close(); } catch (e) { }
    this.audio.srcObject = null; this.dead = true;
  }
}
