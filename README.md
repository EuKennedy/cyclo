# Cyclo

> Projeto pessoal, e bem simples no escopo. Nasceu de duas vontades: praticar
> local-first e criptografia no cliente de verdade, e resolver uma dor real aqui
> em casa — nenhum app de ciclo que a gente testou dava para usar sem entregar
> dado de saúde para um servidor.
>
> Está público porque gosto de deixar o que escrevo legível, não porque estou
> procurando contribuição.

Acompanhamento de ciclo menstrual que funciona offline, sem conta e sem servidor.
A nuvem é opcional, e quando ligada o servidor só recebe texto cifrado que ele
não consegue ler.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-37%20testes-6E9F18?logo=vitest&logoColor=white)

---

## As três decisões que moldaram o resto

**O aparelho é a fonte da verdade.** Tudo vive no IndexedDB e o app abre e
funciona sem rede e sem cadastro. Sincronizar é opção, não requisito. Datas são
gravadas como `YYYY-MM-DD` na meia-noite local, nunca como timestamp, porque
fuso horário em app de ciclo vira menstruação começando um dia antes.

**A chave nunca sai do aparelho.** A sincronização opcional deriva a chave de uma
frase-senha via PBKDF2-SHA256 com 310 mil iterações (recomendação da OWASP), e
cifra tudo em AES-GCM antes de subir. O sal é o id do usuário: precisa ser único,
não secreto, e assim a frase-senha sozinha destrava os dados em qualquer
aparelho, sem nada extra guardado. O Supabase guarda envelope cifrado e mais nada.

**Previsão nunca vira contracepção.** O motor devolve faixa de probabilidade com
nível de confiança, e o conceito de "dia seguro" não existe em lugar nenhum do
código. Isso é regra do modelo, não aviso na tela — está em
[`src/domain/predictions.ts`](src/domain/predictions.ts) e em
[`docs/RESEARCH-SPEC.md`](docs/RESEARCH-SPEC.md) §2.5.

## Compartilhar com o parceiro, sem entregar o diário

A parte que mais deu trabalho de projetar. O link é opcional, permanente — não
expira — e pode ser revogado a qualquer momento.

O que viaja é só a semente do ciclo: primeiro nome, data da última menstruação e
as médias de duração. **Sintoma, humor, anotação e atividade sexual nunca saem.**
A tela do parceiro recalcula a fase do dia a partir da semente, então o link
continua correto conforme os dias passam sem reenviar nada.

Dois segredos independentes protegem isso, e o servidor não tem nenhum dos dois
de forma útil:

| segredo | onde vive |
| --- | --- |
| token aleatório do link | no banco, sozinho não abre nada |
| chave AES do compartilhamento | no fragmento da URL (`#k=`), que o navegador nunca envia ao servidor |

A chave do compartilhamento é gerada aleatoriamente, **não** derivada da
frase-senha. Um link entregue a alguém jamais pode destravar os dados dela.

## O motor de previsão

Funções puras sobre uma lista ordenada de datas de início:

```
starts[] -> durações -> estimativa -> próxima menstruação -> ovulação -> janela fértil
```

Cada estimador é trocável sem tocar em quem consome. Dois detalhes que existem
por causa de uso real:

- **`splitMissedLogs`** — um intervalo de ~2× o normal quase sempre é registro
  esquecido, não ciclo de 60 dias. Ele é dividido antes de entrar na média, para
  que um esquecimento não envenene a previsão dos meses seguintes.
- **Confiança explícita** — poucos ciclos registrados, ou muita variação entre
  eles, rebaixam o nível de confiança em vez de fingir precisão.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | React 19 + TypeScript (strict) + Vite |
| UI | Tailwind CSS v4, Framer Motion, Montserrat |
| Local | Dexie (IndexedDB), Zustand |
| Nuvem (opcional) | Supabase + Web Crypto API |
| Testes | Vitest + Testing Library |
| Deploy | GitHub Pages via GitHub Actions |

## Estrutura

```
src/domain/     regras de ciclo e previsão — funções puras, sem React
src/lib/        cripto, banco local, sincronização, compartilhamento
src/features/   uma pasta por tela
src/components/ visual reutilizável
docs/           a especificação que guiou o build
```

O domínio não importa nada de React: dá para ler a lógica de ciclo inteira sem
abrir um componente, e os testes rodam contra ela direto.

## Rodando

Não precisa de configuração. Sem `.env`, o app roda 100% local.

```bash
npm install && npm run dev
```

```bash
npm test        # 37 testes: ciclo, previsão, cripto e menstruações
npm run build   # typecheck + build de produção
```

Para ligar a sincronização opcional, copie `.env.example` para `.env` e preencha
com o seu projeto Supabase. A chave anônima é pública por design no modelo do
Supabase — a segurança vem do Row Level Security, e os dados de saúde já sobem
cifrados de qualquer forma.

## Aviso

Cyclo **não é método contraceptivo** e não substitui acompanhamento médico. As
previsões são estimativas estatísticas a partir do que foi registrado.
