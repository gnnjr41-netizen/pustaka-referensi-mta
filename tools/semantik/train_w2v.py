import sys, time, logging
from gensim.models import Word2Vec
from gensim.models.word2vec import LineSentence
t = time.time()
m = Word2Vec(LineSentence(sys.argv[1]), vector_size=int(sys.argv[3]), window=6, min_count=4, sg=1, negative=10, sample=1e-4, epochs=int(sys.argv[4]), workers=2, seed=42)
m.save(sys.argv[2]); print("vocab", len(m.wv), "secs", round(time.time() - t))
for w in ["الصبر","المصيبه","الامانه","curang", "amanah", "sabar", "musibah", "berbakti", "tua", "syariat", "nafsu", "janji", "dagang", "berdagang", "jujur", "suami", "istri", "rumah", "khianat", "ujian", "takaran"]:
    if w in m.wv: print(w, "→", ", ".join(f"{x}({s:.2f})" for x, s in m.wv.most_similar(w, topn=10)))
    else: print(w, "(tidak ada)")
