import { Loader2 } from 'lucide-react'
import { memo } from 'react'
import { Flexbox } from 'react-layout-kit'

import { useStyles } from '../style'
import { ChatItemProps } from '../type'
import { Icon } from '@lobehub/ui'

export interface LoadingProps {
  loading?: ChatItemProps['loading']
  placement?: ChatItemProps['placement']
}

const Loading = memo<LoadingProps>(({ loading, placement }) => {
  const { styles } = useStyles({ placement })

  if (!loading) return null

  return (
    <Flexbox align={'center'} className={styles.loading} justify={'center'}>
      <Icon icon={Loader2} size={{ size: 12, strokeWidth: 3 }} spin />
    </Flexbox>
  )
})

export default Loading
