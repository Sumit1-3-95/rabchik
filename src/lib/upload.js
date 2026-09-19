import { supabase } from './supabase'

export const MAX_VIDEO_SECONDS = 60
export const MAX_FILE_MB = 100

/** Resize + re-encode photos on the phone so uploads are fast and storage stays small. */
async function compressImage(file, maxDim = 1600, quality = 0.82) {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * scale)
    const h = Math.round(bmp.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h)
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
    return blob || file
  } catch {
    return file // e.g. unsupported format: upload as-is
  }
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
  if (file.type.startsWith('image/')) return { kind: 'image', duration: null }
  if (file.type.startsWith('video/')) {
    const duration = await getVideoDuration(file)
    if (duration && duration > MAX_VIDEO_SECONDS + 1) {
      throw new Error(`Videos can be up to ${MAX_VIDEO_SECONDS} seconds ("${file.name}" is ${Math.round(duration)}s)`)
    }
    return { kind: 'video', duration }
  }
  throw new Error(`"${file.name}" is not a photo or video`)
}

/** Uploads a file into the media bucket. Returns the storage path. */
export async function uploadFile(file, folder) {
  const isImage = file.type.startsWith('image/')
  const body = isImage ? await compressImage(file) : file
  const ext = isImage ? 'jpg' : (file.name.split('.').pop() || 'mp4').toLowerCase()
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, body, {
    contentType: isImage ? 'image/jpeg' : file.type,
    cacheControl: '31536000',
  })
  if (error) throw error
  return path
}
