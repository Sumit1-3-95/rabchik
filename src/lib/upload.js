import { supabase, mediaUrl } from './supabase'

export const MAX_VIDEO_SECONDS = 60
export const MAX_FILE_MB = 100

const isHeic = (f) => /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name)

function decodeWithImgTag(file) {
  return new Promise((resolve, reject) => {
    const u = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(u); resolve({ src: img, width: img.naturalWidth, height: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(u); reject(new Error('decode failed')) }
    img.src = u
  })
}

/** Resize + re-encode photos so uploads are fast and always viewable. Returns { blob, type, ext }. */
async function prepareImage(file, maxDim = 1600, quality = 0.82) {
  let bmp
  try { bmp = await createImageBitmap(file) } catch { /* try the <img> route */ }
  if (!bmp) { try { bmp = await decodeWithImgTag(file) } catch { /* handled below */ } }
  if (!bmp) {
    if (isHeic(file)) throw new Error('This photo is in HEIC format, which this browser cannot show. Please pick a JPG or PNG, or upload from your phone.')
    // unknown format the browser could not decode: upload as-is with its real type
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    return { blob: file, type: file.type || 'image/jpeg', ext }
  }
  const src = bmp.src || bmp
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d').drawImage(src, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
  if (!blob) return { blob: file, type: file.type || 'image/jpeg', ext: 'jpg' }
  return { blob, type: 'image/jpeg', ext: 'jpg' }
}

export function getVideoDuration(file) {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src)
      resolve(v.duration)
    }
    v.onerror = () => resolve(null)
    v.src = URL.createObjectURL(file)
  })
}

/** Validates a picked file. Returns { kind, duration } or throws a friendly Error. */
export async function checkFile(file) {
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`"${file.name}" is over ${MAX_FILE_MB} MB`)
  if (file.type.startsWith('image/') || isHeic(file)) return { kind: 'image', duration: null }
  if (file.type.startsWith('video/')) {
    const duration = await getVideoDuration(file)
    if (duration && duration > MAX_VIDEO_SECONDS + 1) {
      throw new Error(`Videos can be up to ${MAX_VIDEO_SECONDS} seconds ("${file.name}" is ${Math.round(duration)}s)`)
    }
    return { kind: 'video', duration }
  }
  throw new Error(`"${file.name}" is not a photo or video`)
}

function videoPoster(file, maxDim = 400) {
  return new Promise((resolve) => {
    const u = URL.createObjectURL(file)
    const v = document.createElement('video')
    const done = (b) => { URL.revokeObjectURL(u); resolve(b) }
    const t = setTimeout(() => done(null), 8000)
    v.muted = true; v.playsInline = true; v.preload = 'auto'
    v.onloadeddata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2) }
    v.onseeked = () => {
      try {
        const sc = Math.min(1, maxDim / Math.max(v.videoWidth, v.videoHeight))
        const c = document.createElement('canvas')
        c.width = Math.round(v.videoWidth * sc); c.height = Math.round(v.videoHeight * sc)
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
        c.toBlob((b) => { clearTimeout(t); done(b) }, 'image/jpeg', 0.75)
      } catch { clearTimeout(t); done(null) }
    }
    v.onerror = () => { clearTimeout(t); done(null) }
    v.src = u
  })
}

async function putWithRetry(path, body, opts, tries = 3) {
  let last
  for (let n = 0; n < tries; n++) {
    const { error } = await supabase.storage.from('media').upload(path, body, opts)
    if (!error) return
    last = error
    await new Promise((r) => setTimeout(r, 600 * (n + 1)))
  }
  throw new Error(`Upload failed: ${last.message}`)
}

/**
 * Uploads a file into the media bucket. Returns the storage path.
 * Also stores a small 400px preview as "t_<name>.jpg" beside it so galleries load fast (best effort).
 */
export async function uploadFile(file, folder) {
  const isImage = file.type.startsWith('image/') || isHeic(file)
  let body = file
  let type = file.type
  let ext = (file.name.split('.').pop() || 'mp4').toLowerCase()
  if (isImage) ({ blob: body, type, ext } = await prepareImage(file))
  const id = crypto.randomUUID()
  const path = `${folder}/${id}.${ext}`
  const cc = { contentType: type || undefined, cacheControl: '31536000' }
  await putWithRetry(path, body, cc)
  try {
    const thumb = isImage ? (await prepareImage(file, 400, 0.72)).blob : await videoPoster(file)
    if (thumb && thumb.type === 'image/jpeg') {
      await putWithRetry(`${folder}/t_${id}.jpg`, thumb, { contentType: 'image/jpeg', cacheControl: '31536000' }, 2)
    }
  } catch (e) { console.warn('preview not created', e) }
  return path
}