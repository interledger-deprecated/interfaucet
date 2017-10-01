const http = require('http')
const Plugin = require('ilp-plugin-btp-client')
const IlpPacket = require('ilp-packet')
const uuid = require('uuid/v4')
function base64url (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }

const plugin = new Plugin({
  btpUri: 'btp+wss://interfaucet:' + process.env.TOKEN + '@amundsen.michielbdejong.com/api/17q3',
})

plugin.connect().then(() => {
  console.log('client started, starting webserver')
  const server = http.createServer((req, res) => {
    Promise.resolve().then(() => {
      const parts = req.url.split('/')
      if (parts.length < 3) {
        res.end('<html><h2>Welcome to Interfaucet!</h2><p>See <a href="https://michielbdejong.github.io/tutorials/payment-requests">the payment requests tutorial</a>.</p>')
        return
      }
      console.log('interfaucet request!', parts)
      const iprBuf = Buffer.from(parts[2], 'hex')
      const ipr = {
        version: iprBuf[0],
        packet: iprBuf.slice(1, iprBuf.length - 32),
        condition: iprBuf.slice(-32)
      }
      console.log('ipr', JSON.stringify(ipr))
      const ipp = IlpPacket.deserializeIlpPayment(ipr.packet)
      console.log('ipp', JSON.stringify(ipp))
      const transfer = {
        id: uuid(),
        from: plugin.getAccount(),
        to: plugin.getInfo().connectors[0],
        ledger: plugin.getInfo().prefix,
        amount: ipp.amount,
        ilp: base64url(ipr.packet),
        executionCondition: ipr.condition.toString('base64'),
        expiresAt: new Date(new Date().getTime() + 1000000).toISOString()
      }
      console.log('lpi', transfer)
      return plugin.sendTransfer(transfer).then(() => {
        res.end(`<html><h2>Congrats!</h2><p>Sent ${ipp.amount} units to ${ipp.account}</p><img src="https://i.pinimg.com/564x/88/84/85/888485cae122717788328b4486803a32.jpg"></html>`)
      })
    }).catch(err => {
      console.log(err, err.message)
      res.end('<html><h2>Oops! Something went wrong.</h2><p>' + err.message + '</p><img src="https://i.pinimg.com/736x/fa/d2/76/fad27608b9bd588fe18231e2babe2b5f--man-faces-strange-places.jpg"></html>')
    })
  })
  server.listen(process.env.PORT)
})
