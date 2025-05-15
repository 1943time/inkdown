import { useTranslation } from 'react-i18next'

export function TreeEmpty() {
  const { t } = useTranslation()
  return (
    <div className={'flex justify-center items-center text-gray-400 pt-32'}>
      <div className={'text-center space-y-2 px-4'}>
        <div className={'text-pretty leading-5 text-[13px]'}>{t('noDocuments')}</div>
      </div>
    </div>
  )
}
