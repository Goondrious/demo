import React, { Component } from 'react'
import { Table } from 'semantic-ui-react'

class DetailedTable extends Component {
  constructor(props){
    super();
  }

  render(){
    const { column, direction } = this.props
    return(
      <Table celled selectable sortable>
        <Table.Header>
          <Table.Row>
          {this.props.headers.map((header,i)=><Table.HeaderCell key={i} onClick={this.props.handleSort(header.key)} sorted={column === header.key ? direction : null}>
            {header.display}
            </Table.HeaderCell>)}
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {this.props.data.map((datum,i)=>{
            return       <Table.Row key={i} positive={datum.highlight}>
                          <Table.Cell>{datum.chartDate}</Table.Cell>
                          <Table.Cell>{datum.hour}</Table.Cell>
                          <Table.Cell>{datum.name}</Table.Cell>
                          <Table.Cell>{datum.impressions}</Table.Cell>
                          <Table.Cell>{datum.clicks}</Table.Cell>
                          <Table.Cell>{datum.revenue}</Table.Cell>
                        </Table.Row>
          })}
        </Table.Body>
      </Table>
    )
  }
}

export default DetailedTable