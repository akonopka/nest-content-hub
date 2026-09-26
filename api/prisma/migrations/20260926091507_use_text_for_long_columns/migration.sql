-- AlterTable
ALTER TABLE `posts` MODIFY `content` TEXT NULL;

-- AlterTable
ALTER TABLE `questions` MODIFY `question` TEXT NOT NULL,
    MODIFY `answer` TEXT NULL;
