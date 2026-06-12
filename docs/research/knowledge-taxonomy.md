# タクソノミーから学ぶ知識分類の理論と実践

> 本ドキュメントは、project_gr における知識（Knowledge）モデルの `category` / `tags` 設計に活用するため、タクソノミー分野の主要理論をWeb収集・整理したものである。

---

## 1. 知識の種類（What kind of knowledge?）

### 1-1. Bloom改訂版タクソノミー（2001）の知識次元

Bloom（1956）の教育目標分類学は2001年に改訂され、**知識の型**と**認知プロセス**が分離された。知識の型は4種に整理される。

| 型 | 英名 | 内容 | 例（釣り） |
|----|------|------|-----------|
| 事実的知識 | Factual | 孤立した情報の断片、用語・詳細事実 | 「ブラックバスはスモールマウスとラージマウスがいる」 |
| 概念的知識 | Conceptual | 複雑で組織化された知識。原理・理論・モデル | 「水温と魚の活性の関係モデル」 |
| 手続き的知識 | Procedural | やり方の知識。スキル・アルゴリズム・技法 | 「テキサスリグの結び方」 |
| メタ認知的知識 | Metacognitive | 自分の認知についての知識・学習方略の認識 | 「自分は視覚的情報より触覚フィードバックで上達する」 |

**重要な対応関係**:
- 事実的・概念的 → **"何を知っているか"（what）**
- 手続き的・メタ認知的 → **"どうやるか"（how）**
- 事実的・手続き的 → 低次知識
- 概念的・メタ認知的 → 高次知識

---

### 1-2. 暗黙知 vs 形式知（Polanyi / Nonaka）

Polanyi（1966）の「われわれは語れる以上のことを知っている（We can know more than we can tell）」という命題が原点。

| 種別 | 英名 | 特徴 |
|------|------|------|
| 暗黙知 | Tacit | 言語化困難、身体化されている。直感・コツ・勘 |
| 形式知 | Explicit | 言語・数値で表現可能。マニュアル・データ |

**Nonaka & Takeuchi の SECI モデル**（知識変換の4プロセス）:

```
Tacit → Tacit    : 共同化（Socialization）  ─ 見て盗む、一緒に作業する
Tacit → Explicit : 表出化（Externalization）─ コツを言語化する
Explicit → Explicit: 連結化（Combination）  ─ 情報を組み合わせ新知識生成
Explicit → Tacit : 内面化（Internalization）─ 読んで体で覚える
```

**project_gr への示唆**:
- `webSources` から収集した情報 = 形式知（Explicit）
- ユーザーの経験ログ = 暗黙知を形式知に変換しようとする試み
- Gemini が両者を統合 = SECI の Combination + Externalization を担う

---

## 2. 専門性の段階分類（How deep is the knowledge?）

### Dreyfus モデル（1980s）

スキル習得の5段階モデル。ルールベースから直感へと移行する。

| 段階 | 英名 | 特徴 |
|------|------|------|
| 1 | Novice（初心者） | 教則通りの規則に従う。文脈を読めない |
| 2 | Advanced Beginner（上達中） | ルールと文脈を結びつけ始める |
| 3 | Competent（有能） | 規則ベースから状況ベースへ移行 |
| 4 | Proficient（熟練） | 直感で適切な行動を選べる |
| 5 | Expert（専門家） | 深い理解に基づく完全な直感。深く考えずに最適解 |

**project_gr への示唆**:
- `confidenceScore` は **知識の確信度**だが、ユーザー自身の **熟達段階** も別軸として持てる
- 同じ仮説知識でも、初心者には「これをやれ」、熟練者には「なぜこれが効くか」を提供すべき
- Dreyfus の段階は将来的な「上達プロセス自体の知識化」のアイデア候補

---

## 3. 知識体系の組織化手法（How to structure knowledge?）

### 3-1. 三者の比較

| 概念 | 定義 | 特徴 | 例 |
|------|------|------|-----|
| **Taxonomy** | 親子関係によるツリー型階層分類 | 固定的・トップダウン・ナビゲーション向き | リンネの生物分類、Bloom分類 |
| **Ontology** | 概念と概念の**関係**を形式定義したもの | 意味・推論・文脈を持つ。柔軟だが重い | 医療用語体系、Wikidata |
| **Folksonomy** | ユーザーが自由に付けるタグの集合 | ボトムアップ・柔軟・曖昧・スケールしやすい | Twitter ハッシュタグ、del.icio.us |

**Taxonomy が向いている場面**: 明確な親子関係があり、ナビゲーションが主目的  
**Ontology が向いている場面**: 意味的検索・推論が必要  
**Folksonomy が向いている場面**: ユーザー主導・予測不能なドメイン

---

### 3-2. ファセット分類（Faceted Classification）

情報は**多次元的**であり、単一階層では表現できないという考え方。複数のファセット（側面）を組み合わせて分類する。

```
例：釣り知識のファセット
  [魚種]    × [場所]     × [季節]   × [技法]    × [装備]
  バス       湖           春         巻き物       スピニング
  バス       リバー       夏         テキサス     ベイト
  トラウト   渓流         秋         フライ       フライロッド
```

**メリット**:
- ファセットを自由に追加でき、既存の階層を崩さない
- ユーザーが複数軸でナビゲートできる
- 新しい組み合わせが自動的に生まれる

**project_gr への示唆**:
- `category` = 主ファセット（例：技術・道具・環境・身体・メンタル）
- `tags` = 追加ファセット群（自由組み合わせ）
- ファセット設計により「条件Aかつ条件B」での知識検索が可能になる

---

## 4. スポーツ・運動スキルの分類（実践ドメインへの応用）

スポーツ科学では、スキルを以下の連続体（continuum）で分類する。

### 4-1. 環境安定性

| 種別 | 英名 | 特徴 | 例 |
|------|------|------|-----|
| クローズドスキル | Closed Skill | 環境が安定・予測可能。習慣的実行 | 高飛び込み、フリースロー、フォームキャスト |
| オープンスキル | Open Skill | 環境が変化・複雑。状況判断が必要 | 対戦格闘技、ボール競技、フィッシング全般 |

### 4-2. 運動の大きさ

| 種別 | 特徴 | 例 |
|------|------|-----|
| 粗大運動（Gross） | 大筋群を使う全身運動 | キャスト動作、投球 |
| 微細運動（Fine） | 手指・手首の細かい動き | 結び・ノット、バランス調整 |

### 4-3. Gagné の学習成果分類（5カテゴリ）

| カテゴリ | 内容 |
|----------|------|
| 知的スキル | ルール・概念を使った問題解決 |
| 認知的方略 | 自分の学習を制御する方法 |
| 言語情報 | 事実・命題の記憶 |
| 運動スキル | 身体的な技能の実行 |
| 態度 | 行動選択に影響する内的状態 |

---

## 5. ベイズ的確信度更新（Confidence Score の理論的根拠）

### 基本原理

```
P(H|E) = P(E|H) × P(H) / P(E)

事後確率 = 尤度 × 事前確率 / 証拠の確率
```

- **Prior（事前確率）**: 証拠を見る前の確信度
- **Likelihood（尤度）**: その証拠がどれだけ仮説を支持するか
- **Posterior（事後確率）**: 証拠を取り込んだ後の更新された確信度

### 確信度と分散の関係

> 「事前確率の確信度が低いほど、新たな証拠が来たときに更新幅が大きい」

- 初期の `confidenceScore` が低い（不確か）→ 経験1件で大きく動く
- 高確信度（score が高い）→ 反証でも動きにくい（慣性がある）

### project_gr での実装示唆

```
score の更新ロジック案:
  - 支持する経験   → score × (1 + 0.1 × 尤度係数)
  - 反証する経験   → score × (1 - 0.15 × 尤度係数)
  - 尤度係数       → Gemini が「高(1.0) / 中(0.6) / 低(0.3)」で判定
  - 複数回再現     → 尤度係数にボーナス乗算
```

---

## 6. project_gr のカテゴリ設計案（総合）

上記理論を踏まえた、`category` フィールドの推奨ファセット設計。

### 主カテゴリ（category フィールド）

| カテゴリ名 | 対象とする知識 |
|-----------|---------------|
| **技術（Technique）** | やり方・手続き。「どうやるか」の知識（Procedural） |
| **原理（Principle）** | なぜそうなるかの理論・メカニズム（Conceptual） |
| **道具・装備（Equipment）** | ギア、ツール、素材の特性 |
| **環境（Environment）** | 場所・天候・季節・水温など文脈情報 |
| **身体（Physical）** | フォーム、体力、怪我、コンディション |
| **メンタル（Mental）** | モチベーション、集中力、ルーティン |
| **戦略（Strategy）** | 状況判断・ゲームプラン・リソース配分 |
| **メタ学習（Meta-Learning）** | 上達プロセス自体への知識（Metacognitive）|

### タグ設計（tags フィールド）

タグは自由なファセットとして、上記カテゴリを補完する。

```
推奨タグ例（釣りドメイン）:
  魚種: [bass, trout, carp, ...]
  場所: [lake, river, shore, boat]
  季節: [spring, summer, autumn, winter]
  時間帯: [dawn, daytime, dusk, night]
  難易度: [beginner, intermediate, expert]
  確信度: [speculative, tested, proven]
```

---

## 7. 既存の知識分類体系との対応

| 本プロジェクトの概念 | 対応する理論 |
|---------------------|-------------|
| hypothesis | 低確信度の Conceptual/Procedural Knowledge |
| verified | 高確信度（反証されていない）の知識（ポパーの反証主義） |
| disproved | 反証された知識 |
| confidenceScore | ベイズ的事後確率 |
| category | ファセット分類の主軸 |
| tags | ファセット分類の副軸（Folksonomy 的） |
| webSources | 形式知（Explicit Knowledge）の入力 |
| supportingExperiences | 経験→確信度更新の証拠（Likelihood） |
| （将来アイデア） | 上達プロセス自体の知識化（Metacognitive + Dreyfus）。現時点では未実装 |

---

## 参考文献・Sources

- [Bloom's Taxonomy - Wikipedia](https://en.wikipedia.org/wiki/Bloom%27s_taxonomy)
- [Bloom's Taxonomy | SimplyPsychology](https://www.simplypsychology.org/blooms-taxonomy.html)
- [The 16 Types of Knowledge: A Comprehensive Guide | Guru](https://www.getguru.com/reference/types-of-knowledge)
- [Types of Knowledge - The Peak Performance Center](https://thepeakperformancecenter.com/educational-learning/learning/process/types-of-knowledge/)
- [SECI model of knowledge dimensions - Wikipedia](https://en.wikipedia.org/wiki/SECI_model_of_knowledge_dimensions)
- [The SECI Model by Nonaka & Takeuchi | tixxt](https://www.tixxt.com/en/seci-model/)
- [Dreyfus model of skill acquisition - Wikipedia](https://en.wikipedia.org/wiki/Dreyfus_model_of_skill_acquisition)
- [The Dreyfus Model of Skill Acquisition — A Deep Dive | LeadingSapiens](https://www.leadingsapiens.com/dreyfus-model/)
- [Ontology vs Taxonomy: Choosing the Right Knowledge Organisation Model | SGKG](https://sgkg.org/blog/2026-03-21-ontology-vs-taxonomy-knowledge-organisation/)
- [Faceted Classification - Wikipedia](https://en.wikipedia.org/wiki/Faceted_classification)
- [Folksonomy - Wikipedia](https://en.wikipedia.org/wiki/Folksonomy)
- [Bayesian Updating | GeeksforGeeks](https://www.geeksforgeeks.org/machine-learning/bayesian-updating/)
- [On Prior Confidence and Belief Updating | arXiv](https://arxiv.org/pdf/2412.10662)
- [Skill Classification in Sports | Sport Science Insider](https://sportscienceinsider.com/skill-classification-continuums/)
- [Learning and skill acquisition in sports | PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10823019/)
