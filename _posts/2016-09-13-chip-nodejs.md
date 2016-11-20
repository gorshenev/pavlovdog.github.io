---
title: Installing NodeJS, MongoDB and Geth on ARM computer
---

Hi there, fellows

Few days ago I have received my second [C.H.I.P. computer](https://getchip.com) - bizzare stuff! And if you are tuned in enough (as me), I bet you're using NodeJS or MongoDB in your projects.

With a probability ~99% all the code bellow is correct for different ARM computers, like Raspberry Pi 2/3, C.H.I.P, Banana Pi or Orange Pi.

# Installing NodeJS

```bash
$ sudo apt-get update
$ curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
$ sudo apt-get install nodejs
$ node -v
v7.1.0 # this is the last version
```

# Installing MongoDB

```bash
$ sudo apt-get update
$ sudo apt-get upgrade
$ sudo apt-get install mongodb-server
$ sudo service mongod start
$ mongo # runing mongo cli
```

# Installing Geth

I also have tried to use Parity, but attempt have not been successfull. For those who don't know, Parity is written in Rust, so you need to compile a lot of dependencies to make it work.
It's easy to do with `cargo build` command. So I have runned it and after a few minutes, I've runned `df -h` and notice, that it's already ~25% of ROM in use. So, if your gadget is under-resources - probably it's better to use Geth.

One more nuance - for today, [there is no build for Debian](https://www.reddit.com/r/ethereum/comments/3fzatx/cannot_install_ethgeth_on_debian/). But Ubuntu version also works well.

```bash
$ cd /etc/apt/sources.list.d
$ sudo touch ethereum-ethereum-xenial.list
$ echo "deb http://ppa.launchpad.net/ethereum/ethereum/ubuntu xenial main \n # deb-src http://ppa.launchpad.net/ethereum/ethereum/ubuntu jessie main" > ethereum-ethereum-xenial.list
$ sudo apt-get update
$ sudo apt-get install ethereum
$ geth --dev console # run geth on private blockchain
```

That's it! Good luck :)
