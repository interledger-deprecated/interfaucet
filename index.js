const http = require('http')
const IlpNode = require('ilp-node')
const IlpPacket = require('ilp-packet')

const client = new IlpNode({
  btp: {
    name: 'interfaucet',
    upstreams: [
      {
        url: 'wss://amundsen.michielbdejong.com/ilp-node-3/api/v1',
        token: process.env.TOKEN
      }
    ]
  }
})

client.start().then(() => {
  console.log('client started, starting webserver')
  const server = http.createServer((req, res) => {
    Promise.resolve().then(() => {
      const parts = req.url.split('/')
      console.log('interfaucet request!', parts)
      const iprBuf = Buffer.from(parts[2], 'hex')
      return {
        version: iprBuf[0],
        packet: iprBuf.slice(1, iprBuf.length - 32),
        condition: iprBuf.slice(-32)
      }
    }).then((ipr) => {
      console.log('ipr', JSON.stringify(ipr))
      const ipp = IlpPacket.deserializeIlpPayment(ipr.packet)
      console.log('ipp', JSON.stringify(ipp))
      return client.getPeer('btp').interledgerPayment({
        amount: parseInt(ipp.amount),
        executionCondition: ipr.condition,
        expiresAt: new Date(new Date().getTime() + 3600 * 1000)
      }, ipr.packet)
    }).then(() => {
      res.end('<html><img src="https://i.pinimg.com/564x/88/84/85/888485cae122717788328b4486803a32.jpg"></html>')
    }, err => {
      console.log(err, err.message)
      res.end('<html><img src="https://i.pinimg.com/736x/fa/d2/76/fad27608b9bd588fe18231e2babe2b5f--man-faces-strange-places.jpg"></html>')
    })
  })
  server.listen(process.env.PORT)
})
