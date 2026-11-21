# Choice Support demo script

You’re deciding how to get to campus on a rainy day. Use **Demo campus commute** as your test choice. Read one line at a time and wait for Mirror’s reply. Say **“Mirror”** again if more than 90 seconds pass since its last choice-related reply.

## 1. Create the choice

1. “Mirror, I need to decide how to get to campus.”
2. When Mirror offers to save it, say “Yes, call it Demo campus commute.”
3. “Add biking, driving, and taking the bus.”
4. “Show me my options.”

**Check:** The choice is active with three options and one **Do nothing** option.

## 2. Talk it through and save what matters

1. “I want to stay dry and arrive by nine.”
2. “Help me compare biking and taking the bus.”
3. “A pro for biking is no gas cost.”
4. “A con for biking is getting wet.”
5. “A possible outcome is that I might arrive faster by bike.”
6. “Change the biking con to slippery roads.”
7. “Save a note to check the bus fare.”
8. “The bus fare is three dollars. Update the note.”
9. “Let’s pause here.” If Mirror offers a recap, check the wording and say “Yes, save that recap.”
10. “Show me the saved details for Demo campus commute.”

**Check:** Mirror compares options neutrally. The details show the saved evaluation, fare note, and approved recap.

## 3. Change the options

1. “Drop biking.”
2. “Show me the dropped options.”
3. “Restore biking.”
4. “Rename taking the bus to campus bus.”
5. “Permanently delete driving.” Wait for confirmation, then say “Yes, delete driving.”
6. “Show me the options.”

**Check:** Biking is back with its evaluation. **Campus bus** and **Do nothing** remain. Driving is gone.

## 4. Drop, reopen, and decide

1. “Drop Demo campus commute.”
2. “Show me my dropped choices.”
3. “Reopen Demo campus commute.”
4. “I choose Do nothing for Demo campus commute.”
5. “Show me my decided choices.”
6. “Reopen Demo campus commute.” Then say “Show me its status.”

**Check:** The choice appears in each requested list. After the second reopen, it is active and the previous selection is cleared.

## 5. Record what happened and recall it

1. “I choose the campus bus for Demo campus commute.”
2. “I took the campus bus. Mark it implemented.”
3. “Show me my implemented choices.”
4. “Reopen Demo campus commute.”
5. “What did I pick for Demo campus commute?”

**Check:** Mirror keeps the choice implemented, refuses to reopen it, and recalls **campus bus** as the selection. To demo wake-word expiry, wait 95 seconds before the last question. Ask without “Mirror” first, then repeat with it.

## 6. Delete the demo choice

1. “Permanently delete Demo campus commute.” When asked to confirm, say “No.”
2. “Show me my implemented choices.”
3. “Permanently delete Demo campus commute.” When asked again, say “Yes, permanently delete it.”
4. “Open Demo campus commute.”

**Check:** The choice is still listed after “No.” The final lookup reports it is gone after confirmation.
