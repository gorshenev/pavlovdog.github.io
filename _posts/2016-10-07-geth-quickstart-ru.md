---
title : Пишем умный контракт на Solidity - установка и "Hello, world!"
---

Люди, интересующиеся темой блокчейна, уже не раз слышали о проекте российско-канадского программиста Виталика Бутерина - <a href="http://ethereum.org/">Ethereum</a>, а в вместе с ним и о так называемых умных контрактах. В данном цикле статей я постараюсь максимально просто описать суть Ethereum, умных контрактов, концепцию газа и показать, как пишутся умные контракты.

### Smart Contract & Gas
Если на пальцах, "умный контракт" - это некоторый код, живущий внутри блокчейна. Любой участник сети может его вызвать за небольшую плату. Эта плата и называется Gas, дословно "топливо". Зачем это нужно? Для защиты майнера от злоупотребления мошенником его ресурсов.

Немногие знают, но даже в биткоине есть возможность писать эти самые контракты, но в силу некоторых причин этим мало кто занимается. Одна из главных проблем - язык <a href="https://en.bitcoin.it/wiki/Script">Script</a> не Тьюринг-полный и написать что-то более менее серьезное непросто (чтобы вы понимали масштаб проблемы - нет даже возможности добавить цикл). В случае с Ethereum все чуть по другому, языки Тьюринг-полные, и есть риск, что кто-то напишет контракт вида

```javascript
// Это псевдокод
foo = 0;
while (True) {
    foo++;
}
```

Понятно, что майнер, запустивший этот контракт, закончит нескоро и по факту просто потратит в никуда свои ресурсы. Вот чтобы такого не произошло, разработчики Ethereum и придумали газ - в реальности запускать код вроде того, что я написал, будет просто экономически нецелесообразно, потому что вызвавшему придется заплатить за каждое действие контракта.
Стоимость вызова контракта в газе очень легко посчитать - готовый код можно скомпилировать и представить в виде последовательности ассемблерных команд. Вот <a href="https://ethereum.github.io/browser-solidity/">онлайн компилятор</a>, в нем уже есть пример кода, надо только нажать <b>Compile </b>> <b>Toggle Details </b>> <b>Assembly</b>. Для каждой команды есть захардкоженая стоимость.

На данный момент дефолтная стоимость одного газа равна 50 shannon - то есть 50 * 10^-9 эфира.

### Environment
Для того, чтобы начать работать с Ethereum, не обязательно синхронизировать весь текущий блокчейн - платформа позволяет легко создать так называемый "private blockchain", что мы и сделаем. Это разумно не только потому что на скачивание всей цепочки у вас уйдет примерно пару дней, но и потому что можно будет играть с контрактами не платя за это реальных денег (а газ нужно платить, в том числе и за загрузку контракта в блокчейн).

#### Установка command line клиента Ethereum
Мы воспользуемся <a href="https://github.com/ethereum/go-ethereum/wiki/geth">Geth</a>. Он написан на Go и его рекомендуют использовать в большинстве статей. Вот его <a href="https://github.com/ethereum/go-ethereum/wiki/Building-Ethereum">официальная документация</a>.

```bash
    sudo apt-get install software-properties-common
    sudo add-apt-repository -y ppa:ethereum/ethereum
    sudo apt-get update
    sudo apt-get install ethereum
```
Инструкции по установке на другие ОС можно найти <a href="https://www.ethereum.org/cli">здесь</a>. Здесь же можно найти другие имплементации клиента - на C++ или на Python.

#### Поднимаем ноду
Для начала работы достаточно написать в терминале <code>geth</code>. Эта команда запустит ноду для работы в главном блокчейне и начнет синхронизировать блоки. Мы этого делать не будем, но если вам очень нужно, то рекомендую использовать <code>geth --fast --cache 1024</code>. Важный момент - с флагом --fast вы загружаете только заголовки блоков и, если верить интернетам, то можно скачать 500.000 блоков за пол часа, что на порядок быстрее классической синхронизации. Но если вы уже начинали скачивание без этого флага, то придется все удалить и начать заново. Подробнее <a href="http://ethereum.stackexchange.com/a/3805/4406">здесь</a>.

Главная для нас опция - это console, которая позволит нам работать с geth в интерактивном режиме. Также будем использовать флаг --dev, который запустит geth в режиме приватного блокчейна.<code>geth --dev console</code>. Будем считать, что теперь вы неплохо разобрались с тонкостями geth. В качестве примера ниже приведен код работы с майнером, думаю вы все сами поймете.

```javascript
> personal.newAccount("123") // Создаем новый аккаунт с паролем "123"
"0x07ae7ebb7b9c65b51519fc6561b8a78ad921ed13" // Его адрес
> eth.accounts // Смотрим список аккаунтов
["0x07ae7ebb7b9c65b51519fc6561b8a78ad921ed13"]
> miner.setEtherbase(eth.accounts[0]) // Устанавливаем его в качестве аккаунта для майнинга
true
> eth.coinbase // Проверяем
"0x07ae7ebb7b9c65b51519fc6561b8a78ad921ed13" // Все верно
> miner.start() // Я запускаю майнер не в первый раз, поэтому у меня номера блоков 31,32,...
true
I1005 09:25:44.363901 miner/miner.go:136] Starting mining operation (CPU=2 TOT=3)
I1005 09:25:44.364247 miner/worker.go:539] commit new work on block 31 with 0 txs & 0 uncles. Took 291.8µs
I1005 09:25:45.049267 miner/worker.go:342] Mined block (#31 / 4ca861c2). Wait 5 blocks for confirmation
I1005 09:25:45.049567 miner/worker.go:539] commit new work on block 32 with 0 txs & 0 uncles. Took 133.101µs
I1005 09:25:45.049976 miner/worker.go:539] commit new work on block 32 with 0 txs & 0 uncles. Took 121.3µs
I1005 09:25:45.632474 miner/worker.go:342] Mined block (#32 / f79f0df7). Wait 5 blocks for confirmation
I1005 09:25:45.632796 miner/worker.go:539] commit new work on block 33 with 0 txs & 0 uncles. Took 182.601µs
I1005 09:25:45.632915 miner/worker.go:539] commit new work on block 33 with 0 txs & 0 uncles. Took 86.9µs
I1005 09:25:46.441888 miner/worker.go:342] Mined block (#33 / 16e99579). Wait 5 blocks for confirmation
I1005 09:25:46.442257 miner/worker.go:539] commit new work on block 34 with 0 txs & 0 uncles. Took 268.9µs
I1005 09:25:46.442440 miner/worker.go:539] commit new work on block 34 with 0 txs & 0 uncles. Took 120.201µs
> miner.stop()
true
> eth.getBalance(eth.coinbase) // Проверим баланс
15000000000000000000
```

Внимательный читатель заметил, что все написанное подозрительно напоминает JS - это он и есть. Вот например код функции, которая в удобочитаемом виде выводит аккаунты с балансами:

```Javascript
function checkAllBalances() {
    var totalBal = 0;
    for (var acctNum in eth.accounts) {
        var acct = eth.accounts[acctNum];
        var acctBal = web3.fromWei(eth.getBalance(acct), "ether");
        totalBal += parseFloat(acctBal);
        console.log("  eth.accounts[" + acctNum + "]: \t" + acct + " \tbalance: " + acctBal + " ether");
    }
    console.log("  Total balance: " + totalBal + " ether");
};
```

Сохраним это код в geth_scripts.js и запустим его.

```Javascript
> loadScript("geth_scripts.js")
true
> checkAllBalances()
  eth.accounts[0]: 0x07ae7ebb7b9c65b51519fc6561b8a78ad921ed13   balance: 15 ether
undefined
```

Теперь, когда вы стали признанными экспертами Geth, можно со спокойной душой закрыть консоль и как белый человек начать пользоваться GUI.

#### Mist wallet
<a href="https://github.com/ethereum/mist">Mist</a> - пока что самый распространенный кошелек для Ethereum. Написан с использованием Meteor, кроссплатформен, для установки нужно просто скачать установочный файл со <a href="https://github.com/ethereum/mist/releases">страницы релизов</a>.

<img src="https://habrastorage.org/getpro/habr/post_images/0ad/190/b95/0ad190b953259cc749f8532a2885677d.png" alt="image"/>На сегодняшний день не существует так называемых light wallet, которые позволили бы работать с контрактами, поэтому первое что вам предложит Mist - синхронизировать либо Main network, либо Test-net. Нам это все пока что не нужно, мы запустим Mist на нашем приватном блокчейне. Сделать это очень просто:

```Bash
geth --dev --rpc --rpcaddr "0.0.0.0" --rpcapi "admin,debug,miner,shh,txpool,personal,eth,net,web3" console
mist.exe --rpc http://localhost:8545
```
Первая строка делает все тоже самое, что и раньше, но в этот раз мы еще и открываем HTTP-RPC сервер, по дефолту на http://localhost:8545. Флаг rpcapi определяет набор разрешений, который будет иметь Mist, после подключения к серверу. В этом случае указано вообще все что есть. Если, например, не указать personal, то Mist не сможет создавать новые аккаунты и т.д. Весть набор опций командной строки перечислен <a href="https://github.com/ethereum/go-ethereum/wiki/Command-Line-Options">здесь</a>.

Вторая строка запускает Mist с указанным RPC сервером. Если все сработало правильно, то при запуске должна появиться надпись Private-net.

### Hello, world!
Самое время создать ваш первый контракт. Для этого нажимаем на <b>Contracts</b> > <b>Deploy new contract</b>.
В окне <b>Solidity contract source code </b>пишем:

```javascript
contract mortal {
    /*Для адресов есть отдельный тип переменных*/
    address owner;

    /*Данная функция исполняется лишь однажды - при загрузки контракта в блокчейн
    Называется также как и контракт
    Переменной owner присвоится значение адреса отправителя контракта, то есть ваш адрес*/
    function mortal() { owner = msg.sender; }

    /*Функция selfdestruct уничтожает контракт и отправляет все средства со счета контракта на адрес, указанный в аргументе*/
    /*В Ethereum любой участник сети может вызвать любую функцию
    Проверка адреса позволит уничтожить контракт только вам*/
    function kill() { if (msg.sender == owner) selfdestruct(owner); }
}

/*Оператор is отвечает за наследование*/
/*Возможно множественное наследование вида contract_1 is contract_2, contract_3*/
contract greeter is mortal {
    string greeting;

    /*В этом случае при инициализации контракта нужно будет указать строку-аргумент
    В нашем случае это и будет "Hello, world!"*/
    function greeter(string _greeting) public {
        greeting = _greeting;
    }
    
    // Эта функция и отвечает за возвращение "Hello, world!"
    function greet() constant returns (string) {
        return greeting;
    }
}
```

Сам по себе язык довольно прост, вот его <a href="http://solidity.readthedocs.io/en/develop/">документация</a>, многие вопросы уже обсуждались на <a href="http://ethereum.stackexchange.com/">ethereum.stackexchange.com</a>, в принципе есть шанс получить ответы в <a href="https://gitter.im/ethereum">gitter</a>.

#### Загрузка в блокчейн и запуск контракта
После того, как вы выбрали контракт greeting, указали "Hello, world" в качестве аргумента, нажали <b>Deploy</b> и ввели пароль, ваш контракт остается только "замайнить" в блокчейн. Для этого открываем терминал с включенным Geth и майним пару блоков (как это сделать написано выше). Все!

Теперь зайдя на вкладку <b>Contracts </b>вы увидите новый контракт с именем <b>GREETER 7D5D</b>, или типо того. Кликаем на него и наслаждаемся результатом. При желании можно его убить, выбрав в выпадающем списке справа функцию Kill.
