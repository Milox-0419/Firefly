---
title: 我的AI渗透筑基之路：Linux基础命令(一)
published: 2026-09-05
updated: 2026-09-05
draft: false
tags:
  - 成长
  - 网络安全
  - AI渗透
  - Linux
pinned: false
comment: true
---
# Linux基础命令：第一天✌

## `help`命令

`help`命令是寻求帮助时的好帮手，命令不是死记硬背的，而是学会如何在遇到问题时寻求帮助。

*Example:*

`可用命令 — Linux / bash：`

  `pwd ls cd mkdir ...`

`$ help ls`

`LS — ls [-la] [chemin]`

`列出目录的内容。`

## `pwd`——我在哪里？

`pwd`命令会显示当前所在目录的绝对路径。路径总是以/开头，表示根目录，后面跟着用/分割的嵌套目录。

*Example:*

`$ pwd`

`/home/user`

## `ls` ——列出文件

`ls` 命令会显示当前目录中的文件和文件夹。

*Example:*

`$ls`

`documents downloads projects` 

## `ls -la` 详细信息和隐藏文件

`ls`接受用于修改其行为的选项，最重要的是`-l`（长格式）和`-a`（显示隐藏文件）

*Example1:*

`$ ls -l`

`total 3`

`drwxr-xr-x 2 user user 4096 Mar 30 documents`

`drwxr-xr-x 2 user user 4096 Mar 30 downloads`

`drwxr-xr-x 2 user user 4096 Mar 30 projets`

*Example2:*

`$ ls -a`

`.  ..  .bashrc  .profile  documents  downloads  projets`

以 `` 开头的文件`.`会被隐藏。

## 结构剖析

选项用于修改命令的行为。选项有两种写法：简写形式——一个连字符加一个字母，例如“`-l`或`-a`”；以及长写形式——两个连字符加一个单词，例如`--all`“或” `--format=long`。许多工具都支持这两种写法`-a`，并且`--all`功能相同。长写形式更易读（在脚本中很有用），而简写形式输入速度更快。

