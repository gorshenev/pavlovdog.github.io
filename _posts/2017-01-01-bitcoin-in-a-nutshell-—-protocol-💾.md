Транзакции - это чуть ли не самый "главный" объект в сети Bitcoin, да и в других блокчейнах тоже. Поэтому я решил, что если и писать про них целую статью, то тогда нужно рассказать и показать вообще все, что можно. В частности то, как они строются и работают на уровне протокола.

Ниже я объясню, каким образом формируется транзакция, покажу как она подписывается и продемонстрирую механизм общения между нодами.

P.S. Перед чтением статьи рекомендую ознакомиться с [Bitcoin in a nutshell. Transaction]()

![meme](https://cdn.meme.am/cache/instances/folder64/500x/63102064.jpg)

### Table of content

1. Keys and address
2. Searching for nodes
3. Version handshake
4. Setting up a connection
5. Making transaction
6. Signing transaction
7. Sending transaction
8. Links

### Keys and address

Для начала создадим новую пару ключей и адрес. Как это делается я рассказывал в предыдущих статьях, так что здесь все должно быть понятно. Для ускорения процесса возьмем вот этот [набор инструментов для Bitcoin](https://github.com/vbuterin/pybitcointools), написанный самим [Виталиком Бутериным](https://ru.wikipedia.org/wiki/%D0%91%D1%83%D1%82%D0%B5%D1%80%D0%B8%D0%BD,_%D0%92%D0%B8%D1%82%D0%B0%D0%BB%D0%B8%D0%BA), хотя при желании вы можете воспользоваться фрагментами кода из предыдущих статей.

```python
$ git clone https://github.com/vbuterin/pybitcointools
$ cd pybitcointools
$ sudo python setup.py install
$ python
Python 2.7.12 (default, Jul  1 2016, 15:12:24) 
[GCC 5.4.0 20160609] on linux2
Type "help", "copyright", "credits" or "license" for more information.
>>> from bitcoin import *
>>> private_key = "28da5896199b85a7d49b0736597dd8c0d0c0293f130bf3e3e1d102e0041b1293"
>>> public_key = privtopub(private_key)
>>> public_key
'0497e922cac2c9065a0cac998c0735d9995ff42fb6641d29300e8c0071277eb5b4e770fcc086f322339bdefef4d5b51a23d88755969d28e965dacaaa5d0d2a0e09'
>>> address = pubtoaddr(public_key)
>>> address
'1LwPhYQi4BRBuuyWSGVeb6kPrTqpSVmoYz'
```

Я [скинул](https://blockchain.info/tx/60ee91bc1563e44866c66937b141e9ef4615a272fa9d764b9468c2a673c55e01) на адрес `1LwPhYQi4BRBuuyWSGVeb6kPrTqpSVmoYz` 0.00012 BTC, так что теперь можно экспериментировать по полной программе.

### Searching for nodes

Вообще говоря, это хорошая задача на подумать - *как найти других участников сети при том, что сеть децентрализована?* Подробнее про это можете почитать [здесь](http://bitcoin.stackexchange.com/questions/3536/how-do-bitcoin-clients-find-each-other). 

Я покажу два способа. Первый - это **DNS seeding**. Суть в том, что есть некоторые *доверенные* адреса, такие как:

- bitseed.xf2.org
- dnsseed.bluematt.me
- seed.bitcoin.sipa.be
- dnsseed.bitcoin.dashjr.org
- seed.bitcoinstats.com

Они захардкожены в [chainparams.cpp](https://github.com/bitcoin/bitcoin/blob/master/src/chainparams.cpp#L120) и командой `nslookup` можно получить от них адреса нод.

```bash
$ nslookup bitseed.xf2.org
Server:         127.0.1.1
Address:        127.0.1.1#53
Non-authoritative answer:
Name:   bitseed.xf2.org
Address: 76.111.96.126
Name:   bitseed.xf2.org
Address: 85.214.90.1
Name:   bitseed.xf2.org
Address: 94.226.111.26
Name:   bitseed.xf2.org
Address: 96.2.103.25
...
```

Другой способ не такой умный и на практике не используется, но в учебных целях он подходит даже лучше. Заходим на [Shodan](https://shodan.io), регистрируемся, авторизуемся и в строке поиска пишем `port:8333`. Это стандартный порт для `bitcoind`, в моем случае нашлось примерно 9.000 нод:

![shodan](https://habrastorage.org/files/fb7/90e/2b8/fb790e2b891341909733064c9a232456.png) 

### Version handshake

Установка соединения между нодами начинается с обмена двумя сообщениями - первым отправляется [version message](https://en.bitcoin.it/wiki/Protocol_documentation#version), а в качестве ответа на него используется [verack message](https://en.bitcoin.it/wiki/Protocol_specification#verack). Вот иллюстрация процесса *version handshake* из [Bitcoin wiki](https://en.bitcoin.it/wiki/Version_Handshake):

> When the local peer **L** connects to a remote peer **R**, the remote peer will not send any data until it receives a version message.
```
 L -> R: Send version message with the local peer's version
 R -> L: Send version message back
 R:      Sets version to the minimum of the 2 versions
 R -> L: Send verack message
 L:      Sets version to the minimum of the 2 versions
```

### Setting up a connection

Каждое сообщение в сети [должно представляться](https://en.bitcoin.it/wiki/Protocol_documentation#Message_structure) в виде `magic + command + lenght + checksum + payload` - за это отвечает функция `makeMessage`. Этой функцией мы еще воспользуемся, когда будем отправлять транзакцию.

В коде постоянно используется библиотека [struct](https://docs.python.org/2/library/struct.html) - она отвечает за то, чтобы представлять параметры в правильном формате. Например `struct.pack("q", timestamp)` записывает текущее UNIX время в `long long int`, как этого и требует протокол.

```python
import time
import socket
import struct
import random
import hashlib

def makeMessage(cmd, payload):
    magic = "F9BEB4D9".decode("hex") # Main network ID
    command = cmd + (12 - len(cmd)) * "\00"
    length = struct.pack("I", len(payload))
    check = hashlib.sha256(hashlib.sha256(payload).digest()).digest()[:4]
    return magic + command + length + check + payload

def versionMessage():
    version = struct.pack("i", 60002)
    services = struct.pack("Q", 0)
    timestamp = struct.pack("q", time.time())

    addr_recv = struct.pack("Q", 0)
    addr_recv += struct.pack(">16s", "127.0.0.1")
    addr_recv += struct.pack(">H", 8333)

    addr_from = struct.pack("Q", 0)
    addr_from += struct.pack(">16s", "127.0.0.1")
    addr_from += struct.pack(">H", 8333)

    nonce = struct.pack("Q", random.getrandbits(64))
    user_agent = struct.pack("B", 0) # Anything
    height = struct.pack("i", 0) # Block number, doesn't matter

    payload = version + services + timestamp + addr_recv + addr_from + nonce + user_agent + height

    return payload

if __name__ == "__main__":

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect(("93.170.187.9", 8333))

    sock.send(makeMessage("version", versionMessage()))
    sock.recv(1024) # receive version message
    sock.recv(1024) # receive verack message
```

Вот так получившиеся пакеты видит Wireshark (фильтр `bitcoin` или `tcp.port == 8333`)

![wireshark](https://habrastorage.org/files/8a6/476/c95/8a6476c9570b4164bc547e094ddce279.jpg)

### Making transaction

Перед созданием транзакции еще раз открываем [спецификацию](https://en.bitcoin.it/wiki/Protocol_specification#tx) и внимательно ее придерживаемся - отклонение на 1 байт уже делает транзакцию невалидной, так что нужно быть предельно аккуратным. 

Для начала зададим адреса, приватный ключ и хэш [транзакции](https://blockchain.info/tx/60ee91bc1563e44866c66937b141e9ef4615a272fa9d764b9468c2a673c55e01), на которую мы будем ссылаться:

```python
previous_output = "60ee91bc1563e44866c66937b141e9ef4615a272fa9d764b9468c2a673c55e01"
receiver_address = "1C29gpF5MkEPrECiGtkVXwWdAmNiQ4PBMH"
my_address = "1LwPhYQi4BRBuuyWSGVeb6kPrTqpSVmoYz"
private_key = "28da5896199b85a7d49b0736597dd8c0d0c0293f130bf3e3e1d102e0041b1293"
```

Далее создадим транзакцию в "сыром" виде, то есть пока что неподписанную. Для этого достаточно просто следовать спецификации:

```python
def txnMessage(previous_output, receiver_address, my_address, private_key):
    receiver_hashed_pubkey= base58.b58decode_check(receiver_address)[1:].encode("hex")
    my_hashed_pubkey = base58.b58decode_check(my_address)[1:].encode("hex")

    # Transaction stuff
    version = struct.pack("<L", 1)
    lock_time = struct.pack("<L", 0)
    hash_code = struct.pack("<L", 1)

    # Transactions input
    tx_in_count = struct.pack("<B", 1)
    tx_in = {}
    tx_in["outpoint_hash"] = previous_output.decode('hex')[::-1]
    tx_in["outpoint_index"] = struct.pack("<L", 0)
    tx_in["script"] = ("76a914%s88ac" % my_hashed_pubkey).decode("hex")
    tx_in["script_bytes"] = struct.pack("<B", (len(tx_in["script"])))
    tx_in["sequence"] = "ffffffff".decode("hex")

    # Transaction output
    tx_out_count = struct.pack("<B", 1)
    
    tx_out = {}
    tx_out["value"]= struct.pack("<Q", 1000) # Send 1000 satoshis
    tx_out["pk_script"]= ("76a914%s88ac" % receiver_hashed_pubkey).decode("hex")
    tx_out["pk_script_bytes"]= struct.pack("<B", (len(tx_out["pk_script"])))

    tx_to_sign = (version + tx_in_count + tx_in["outpoint_hash"] + tx_in["outpoint_index"] +
                  tx_in["script_bytes"] + tx_in["script"] + tx_in["sequence"] + tx_out_count +
                  tx_out["value"] + tx_out["pk_script_bytes"] + tx_out["pk_script"] + lock_time + hash_code)
```

Заметьте, что в поле `tx_in["script"]` написано отнюдь не `<Sig> <PubKey>`, как этого следовало бы ожидать. Вместо этого указан **блокирующий скрипт транзакции, на которую мы ссылаемся**, в нашем случае это `OP_DUP OP_HASH160 dab3cccc50d7ff2d1d2926ec85ca186e61aef105 OP_EQUALVERIFY OP_CHECKSIG` .

**BTW** нет никакой разницы между привычным `OP_DUP OP_HASH160 dab3cccc50d7ff2d1d2926ec85ca186e61aef105 OP_EQUALVERIFY OP_CHECKSIG` и `76a914dab3cccc50d7ff2d1d2926ec85ca186e61aef105s88ac` - во втором случае просто используется [специальная кодировка](https://github.com/richardkiss/pycoin/blob/master/pycoin/tx/script/opcodes.py#L29) для экономии места:

```
118 = 0x76 = OP_DUP
91 = 0x169 = OP_HASH160
14 = далее следует 14 байт информации
dab3cccc50d7ff2d1d2926ec85ca186e61aef105s88ac = RIPEMD160(SHA256(PubKey))
...
```

### Signing transaction

Теперь самое время подписать транзакцию, здесь все довольно просто:

```python
hashed_raw_tx = hashlib.sha256(hashlib.sha256(tx_to_sign).digest()).digest()
sk = ecdsa.SigningKey.from_string(private_key.decode("hex"), curve = ecdsa.SECP256k1)
vk = sk.verifying_key
public_key = ('\04' + vk.to_string()).encode("hex")
sign = sk.sign_digest(hashed_raw_tx, sigencode=ecdsa.util.sigencode_der)
```

После того, как получена подпись для *raw transaction*, можно заменить locking script на настоящий и привести транзакцию к окончательному виду:

```python
sigscript = sign + "\01" + struct.pack("<B", len(public_key.decode("hex"))) + public_key.decode("hex")

real_tx = (version + tx_in_count + tx_in["outpoint_hash"] + tx_in["outpoint_index"] +
struct.pack("<B", (len(sigscript) + 1)) + struct.pack("<B", len(sign) + 1) + sigscript +
tx_in["sequence"] + tx_out_count + tx_ou["value"] + tx_out["pk_script_bytes"] + tx_out["pk_script"] + lock_time)
```

### Sending transaction

Итоговый код для функции `txnMessage` доступен [здесь](), отправка транзакции в сеть производится так же, как и в случае с *version message*:

```python
if __name__ == "__main__":

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect(("70.68.73.137", 8333))

    sock.send(makeMessage("version", versionMessage()))
    sock.recv(1024) # version
    sock.recv(1024) # verack

    # Sending transaction
    previous_output = "60ee91bc1563e44866c66937b141e9ef4615a272fa9d764b9468c2a673c55e01"
    receiver_address = "1C29gpF5MkEPrECiGtkVXwWdAmNiQ4PBMH"
    my_address = "1LwPhYQi4BRBuuyWSGVeb6kPrTqpSVmoYz"
    private_key = "28da5896199b85a7d49b0736597dd8c0d0c0293f130bf3e3e1d102e0041b1293"

    txn = txnMessage(previous_output, receiver_address, my_address, private_key)
    print "Signed txn:", txn

    sock.send(makeMessage("tx", txn))
    sock.recv(1024)
```

Запускаем получившийся код и идем смотреть на пакеты. Первый признак того, что все сделано правильно - это конечно то, что Wireshark смог верно определить протокол и понять, что чему равно. Второй признак - это ответное сообщение [inv message](https://en.bitcoin.it/wiki/Protocol_documentation#inv) (в противном случае был бы [reject message](https://en.bitcoin.it/wiki/Protocol_documentation#reject)):

![success](https://habrastorage.org/files/47b/d8b/84c/47bd8b84c38c46a2bdd0d173b1334d67.png)

Уже через несколько секунд, после отправления транзакции в сеть, ее можно будет [отследить](https://blockchain.info/ru/address/1LwPhYQi4BRBuuyWSGVeb6kPrTqpSVmoYz), правда сначала она будет числится неподтвержденной. Если все было сделано верно, то спустя какое-то время (вплоть до нескольких часов) транзакция будет включена в блок, а если вы к тому времени не закроете Wireshark, то вам об этом прийдет уведомление (я его закрыл, поэтому ниже чужой скриншот):

![msg_block](http://static.righto.com/images/bitcoin/bitcoin_wireshark_inv.png)

### Links

- [Bitcoins the hard way: Using the raw Bitcoin protocol](http://www.righto.com/2014/02/bitcoins-hard-way-using-raw-bitcoin.html)
- [Analyzing Bitcoin Network Traffic Using Wireshark](https://www.samkear.com/networking/analyzing-bitcoin-network-traffic-wireshark)
- [How the Bitcoin protocol actually works](http://www.michaelnielsen.org/ddi/how-the-bitcoin-protocol-actually-works/)
- [How does a Bitcoin node find its peers?](https://www.quora.com/Bitcoin-How-does-a-Bitcoin-node-find-its-peers)
- [Bitcoin Developer Reference. P2P network](https://bitcoin.org/en/developer-reference#p2p-network)
- [Redeeming a raw transaction step by step](http://bitcoin.stackexchange.com/questions/32628/redeeming-a-raw-transaction-step-by-step-example-required)
