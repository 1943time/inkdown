export const getFileExtension = (name: string) => {
  return name.split('.').pop()
}

export const getFileName = (name: string) => {
  return name.split('.').shift()
}
