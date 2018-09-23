import PropTypes from 'prop-types'
import React, { Component } from 'react'
import {
  Button,
  Container,
  Divider,
  Grid,
  Header,
  Icon,
  Image,
  List,
  Menu,
  Responsive,
  Segment,
  Sidebar,
  Visibility,
} from 'semantic-ui-react'

class DesktopContainer extends Component {

  constructor(props){
    super();
    let activeItem = ""
    window.location.hash.length>2 ? activeItem = window.location.hash.substring(2,window.location.hash.length) : null;
    console.log(activeItem, window.location.hash)
    this.state = { activeItem: activeItem}

  }

  hideFixedMenu = () => this.setState({ fixed: false })
  showFixedMenu = () => this.setState({ fixed: true })
  handleMenuClick = (e, { name }) => this.setState({ activeItem: name })

  render() {
    const { children } = this.props
    const { fixed } = this.state
    const { activeItem } = this.state

    return (
      <Responsive minWidth={Responsive.onlyTablet.minWidth}>
        <Visibility
          once={false}
          onBottomPassed={this.showFixedMenu}
          onBottomPassedReverse={this.hideFixedMenu}
        >
          <Segment
            inverted
            textAlign='center'
            vertical
          >
            <Menu
              fixed={fixed ? 'top' : null}
              inverted={true}
              pointing={!fixed}
              secondary={!fixed}
              size='large'
            >
              <Container>
                <Menu.Item header>
                  <Icon inverted name="spoon" />
                  There Is A Spoon
                </Menu.Item>
                <Menu.Item as='a' href="#" active={ activeItem === "" } name="" onClick={ this.handleMenuClick }>
                  Home
                </Menu.Item>
                <Menu.Item as='a' href="#map" active={ activeItem === "map" } name="map" onClick={ this.handleMenuClick }>Map</Menu.Item>
              </Container>
            </Menu>
          </Segment>
        </Visibility>

        {children}
      </Responsive>
    )
  }
}

DesktopContainer.propTypes = {
  children: PropTypes.node,
}

class MobileContainer extends Component {
  state = { activeItem: "home" }

  handlePusherClick = () => {
    const { sidebarOpened } = this.state

    if (sidebarOpened) this.setState({ sidebarOpened: false })
  }

  handleToggle = () => this.setState({ sidebarOpened: !this.state.sidebarOpened })
  handleMenuClick = (e, { name }) => this.setState({ activeItem: name })

  render() {
    const { children } = this.props
    const { sidebarOpened } = this.state
    const { activeItem } = this.state

    return (
      <Responsive maxWidth={Responsive.onlyMobile.maxWidth}>
        <Sidebar.Pushable>
          <Sidebar as={Menu} animation='uncover' inverted vertical visible={sidebarOpened}>
            <Menu.Item as='a' href="#" active={ activeItem === "home" } name="home" onClick={ this.handleMenuClick }>
              Home
            </Menu.Item>
            <Menu.Item as='a' href="#thatPage" active={ activeItem === "map" } name="map" onClick={ this.handleMenuClick }>Map</Menu.Item>
          </Sidebar>

          <Sidebar.Pusher
            dimmed={sidebarOpened}
            onClick={this.handlePusherClick}
            style={{ minHeight: '100vh' }}
          >
            <Segment
              inverted
              textAlign='center'
              vertical
            >
              <Container>
                <Menu inverted pointing secondary size='large'>
                  <Menu.Item onClick={this.handleToggle}>
                    <Icon name='sidebar' />
                  </Menu.Item>
                  <Menu.Menu position='right'>
                      <Menu.Item header>
                        <Icon inverted name="spoon" position="center"/>
                        There Is A Spoon
                      </Menu.Item>
                  </Menu.Menu>
                </Menu>
              </Container>
            </Segment>

            {children}
          </Sidebar.Pusher>
        </Sidebar.Pushable>
      </Responsive>
    )
  }
}

MobileContainer.propTypes = {
  children: PropTypes.node,
}

const ResponsiveContainer = ({ children }) => (
  <div>
    <DesktopContainer>{children}</DesktopContainer>
    <MobileContainer>{children}</MobileContainer>
  </div>
)

ResponsiveContainer.propTypes = {
  children: PropTypes.node,
}

export default ResponsiveContainer