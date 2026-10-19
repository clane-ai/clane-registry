# clane-plugin

Build a Clane workflow from a prompt in Claude Code, check it, and test it on your machine
with recorded events, on the same engine your customer's machines use.

## Install

```
/plugin marketplace add clane-ai/clane-registry
/plugin install clane-plugin@clane
```

## Prerequisites

- `clane` 0.1.26 or newer (`clane --version`, `clane update`)
- Signed in: `clane login` (`clane whoami` shows who). Testing calls models through Clane on
  your own account. The test report shows the credits spent.

## Use

```
/clane-plugin:create When a customer emails a purchase order to orders@…, read the PDF, build one Order Form CSV per order and reply with it. Samples are in ./samples.
```

The command writes the package, runs `clane flow check` and `clane flow test`, fixes
what fails (at most 3 rounds each), and reports. The command ends with a draft in your
customer's organisation; nothing runs until someone there switches it on.

Developing the plugin: `claude --plugin-dir C:\git\clane-registry\plugins\clane-plugin`.
