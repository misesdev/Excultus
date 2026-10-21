# Problemas conhecidos e pendências reais

| # | Item | Impacto | Próximo passo sugerido |
|---|---|---|---|
| 1 | Downloads não usam WorkManager/foreground service próprio | Se o Android encerrar o processo, downloads param e **retomam do arquivo parcial** na próxima abertura | Worker do WorkManager chamando o mesmo downloader Kotlin, com notificação de progresso |
| 2 | Track Player 4.1.2 depende de `patches/` para RN 0.88 | Atualizações do pacote exigem revisar o patch | Migrar para a 5.x quando estável (só o adapter muda) |
| 3 | E2E `02_import_download_play_resume` usa o Archive.org real | Depende de internet/disponibilidade do serviço | Servidor de fixtures HTTPS com certificado confiável no emulador (ou build flavor de teste) |
| 4 | Reordenação manual usa botões ↑/↓ | Menos fluido que arrastar | Drag-and-drop com `react-native-gesture-handler` + Reanimated (avaliar custo de dependências) |
| 5 | Tema claro e cor de destaque | Exibidos como "Em breve" (arquitetura pronta: nova paleta em `themes`) | Criar `lightPalette` e persistir a escolha em ajustes |
| 6 | Restaurar backup não traz arquivos de áudio | Áudios restaurados precisam ser baixados de novo | Opção de exportar arquivos (ZIP) quando houver espaço |
| 7 | Avisos `act(...)` em testes de componentes | Ruído no console por animações em loop (skeleton/onda); testes passam | Mock de `Animated.loop` no setup |
| 8 | Mini player não tem gesto de deslizar para fechar | Encerrar a sessão está no menu "⋯" do player completo | Gesto de swipe no mini player chamando `player.close()` |
| 9 | Release assinado com chave de debug (padrão do template) | Adequado para instalação pessoal; não para distribuição | Gerar keystore próprio (ver README) |
| 10 | JDK do sistema era apenas JRE | Build requer `JAVA_HOME` apontando para um JDK completo | Documentado no README |
