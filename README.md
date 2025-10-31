AutomataLab is a browser-based tool designed to quickly build and visualize finite automata (DFA/NFA).
It’s meant for students studying Formal Languages and Computability who want a fast, intuitive way to sketch automata and test without installing complex software.

---

## The Purpose

When studying alone, drawing automata on paper can be tedious and slow, especially when experimenting with different transition layouts.  
AutomataLab helps students focus on logic rather than drawing, making exercises and experimentation much faster.

---

## Main Features

- Create and move states with a simple UI  
- Set initial and final states  
- Add labeled transitions  
- Personalize state names  
- Full-screen mode for focus  
- Keyboard shortcuts for main commands  
- Export automaton as PNG

---

## How to use

1. Open the web app  
2. Use the toolbar to add states, transitions, or mark initial/final states  
3. Click **"Export as PNG"** to save your automaton  

---

## What’s next?

- Text-based automaton definition (sort of like GeoGebra)  
- CFG input and normalization (inspired by DB normalization tools like [kitsugo.com/tool/database-normalizer](https://kitsugo.com/tool/database-normalizer/))  
- PDA visualization and simulation  
- Automaton validation (determinism, unreachable states)  
- Import/export to JSON format

---

## Contributing

Contributions are more than welcome.  
Feel free to open issues or PRs with improvements and bug fixes.  

Some issues I should spend more time on are:  
- Good arrow drawing  
- Transitions supporting more than one symbol  
- A way to distinguish epsilon-transitions not up to user  
- Documentation and examples on how to use it  
- In general, the codebase is not very clean since I just migrated from plain vanilla JS and HTML to Angular.

---

## License

MIT License