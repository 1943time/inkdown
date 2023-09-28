import {Article} from './render/Article'
import {Header} from './Header'
import {Leading} from './Leading'
import {DocSearch} from './DocSearch'

export function Doc(props: {
  schema: any[]
  title: string
}) {
  return (
    <>
      <Header title={props.title}/>
      <div className={'doc-container single'}>
        <div className={'content'}>
          <Article schema={props.schema}/>
        </div>
        <Leading schema={props.schema}/>
        <DocSearch/>
      </div>
    </>
  )
}
